/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";
import { StrategicHint, AiResponse, DebugInfo } from "../types";

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} else {
    console.error("API_KEY is missing from environment variables.");
}

const MODEL_NAME = "gemini-2.5-flash";

export interface TargetCandidate {
  id: string;
  color: string;
  size: number;
  row: number;
  col: number;
  pointsPerBubble: number;
  description: string;
}

export const getStrategicHint = async (
  imageBase64: string,
  validTargets: TargetCandidate[], // Now contains candidates for ALL colors
  dangerRow: number,
  language: 'zh' | 'en' = 'zh'
): Promise<AiResponse> => {
  const startTime = performance.now();
  
  // Default debug info container
  const debug: DebugInfo = {
    latency: 0,
    screenshotBase64: imageBase64, // Keep the raw input for display
    promptContext: "",
    rawResponse: "",
    timestamp: new Date().toLocaleTimeString()
  };

  if (!ai) {
    return {
        hint: { message: language === 'zh' ? "API 密钥缺失。" : "API Key missing." },
        debug: { ...debug, error: "API Key Missing" }
    };
  }

  // Local Heuristic Fallback
  const getBestLocalTarget = (msg: string = "No clear shots—play defensively."): StrategicHint => {
    if (validTargets.length > 0) {
        // Sort by Total Potential Score (Size * Value) then Height
        const best = validTargets.sort((a,b) => {
            const scoreA = a.size * a.pointsPerBubble;
            const scoreB = b.size * b.pointsPerBubble;
            return (scoreB - scoreA) || (a.row - b.row);
        })[0];
        
        const zhColorMap: Record<string, string> = {
            red: "红色", blue: "蓝色", green: "绿色", yellow: "黄色", purple: "紫色", orange: "橙色"
        };
        const colorName = language === 'zh' ? (zhColorMap[best.color] || best.color) : best.color.toUpperCase();
        
        return {
            message: language === 'zh' 
                ? `备选策略：选择第 ${best.row} 行的 ${colorName} 泡泡`
                : `Fallback: Select ${best.color.toUpperCase()} at Row ${best.row}`,
            rationale: language === 'zh'
                ? "基于本地计算，选择了当前可消去的最高得分泡泡簇。"
                : "Selected based on highest potential cluster score available locally.",
            targetRow: best.row,
            targetCol: best.col,
            recommendedColor: best.color as any
        };
    }
    return { 
        message: language === 'zh' ? "没有发现直接瞄准目标 - 建议防守击打。" : msg, 
        rationale: language === 'zh' ? "本地未找到可以直接相连并消去的有效泡泡簇。" : "No valid clusters found to target." 
    };
  };

  const hasDirectTargets = validTargets.length > 0;
  
  const targetListStr = hasDirectTargets 
    ? validTargets.map(t => 
        `- OPTION: Select ${t.color.toUpperCase()} (${t.pointsPerBubble} pts/bubble) -> Target [Row ${t.row}, Col ${t.col}]. Cluster Size: ${t.size}. Total Value: ${t.size * t.pointsPerBubble}.`
      ).join("\n")
    : "NO MATCHES AVAILABLE. Suggest a color to set up a future combo.";
  
  debug.promptContext = targetListStr;

  const prompt = `
    You are a strategic gaming AI analyzing a Bubble Shooter game where the player can CHOOSE their projectile color.
    I have provided a screenshot of the current board and a list of valid targets for all available colors.

    ### GAME STATE
    - Danger Level: ${dangerRow >= 6 ? "CRITICAL (Bubbles near bottom!)" : "Stable"}
    
    ### SCORING RULES
    - Red: 100 pts
    - Blue: 150 pts
    - Green: 200 pts
    - Yellow: 250 pts
    - Purple: 300 pts
    - Orange: 500 pts (High Value Target!)

    ### AVAILABLE MOVES (Validated Clear Shots)
    ${targetListStr}

    ### YOUR TASK
    Analyze the visual board state. 
    1. Choose the BEST color for the player to equip.
    2. Tell them where to shoot that specific color.
    
    Prioritize:
    1. **High Score**: Hitting high-value colors (Orange/Purple) matches.
    2. **Avalanche**: Hitting high up on the board to drop non-matching bubbles below.
    3. **Survival**: If Danger is CRITICAL, ignore score and clear the lowest bubbles.

    ### LANGUAGE RULE
    You MUST output the "message" and "rationale" fields in ${language === 'zh' ? 'Simplified Chinese (简体中文)' : 'English'}.

    ### OUTPUT FORMAT
    Return RAW JSON only. Do not use Markdown. Do not use code blocks.
    JSON structure:
    {
      "message": "Short operational directive in ${language === 'zh' ? 'Simplified Chinese' : 'English'}",
      "rationale": "One sentence explaining the strategic benefit in ${language === 'zh' ? 'Simplified Chinese' : 'English'}",
      "recommendedColor": "red|blue|green|yellow|purple|orange",
      "targetRow": integer,
      "targetCol": integer
    }
  `;

  try {
    // Strip the data:image/png;base64, prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
            { text: prompt },
            { 
              inlineData: {
                mimeType: "image/png",
                data: cleanBase64
              } 
            }
        ]
      },
      config: {
        maxOutputTokens: 2048, // Increased to ensure full JSON response
        temperature: 0.4,
        responseMimeType: "application/json" 
        // NOTE: responseSchema removed to avoid empty/blocked responses
      }
    });

    const endTime = performance.now();
    debug.latency = Math.round(endTime - startTime);
    
    let text = response.text || "{}";
    debug.rawResponse = text;
    
    // Robust JSON Extraction: 
    // Isolate the substring between the first '{' and the last '}'
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        text = text.substring(firstBrace, lastBrace + 1);
    } 

    try {
        const json = JSON.parse(text);
        debug.parsedResponse = json;
        
        const r = Number(json.targetRow);
        const c = Number(json.targetCol);
        
        if (!isNaN(r) && !isNaN(c) && json.recommendedColor) {
            return {
                hint: {
                    message: json.message || (language === 'zh' ? "发现了绝佳射击点！" : "Good shot available!"),
                    rationale: json.rationale,
                    targetRow: r,
                    targetCol: c,
                    recommendedColor: json.recommendedColor.toLowerCase()
                },
                debug
            };
        }
        return {
            hint: getBestLocalTarget(language === 'zh' ? "AI 返回了无效的目标坐标" : "AI returned invalid coordinates"),
            debug: { ...debug, error: "Invalid Coordinates in JSON" }
        };

    } catch (e: any) {
        console.warn("Failed to parse Gemini JSON:", text);
        return {
            hint: getBestLocalTarget(language === 'zh' ? "AI 响应解析错误" : "AI response parse error"),
            debug: { ...debug, error: `JSON Parse Error: ${e.message}` }
        };
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const endTime = performance.now();
    debug.latency = Math.round(endTime - startTime);
    return {
        hint: getBestLocalTarget(language === 'zh' ? "AI 服务连接失败" : "AI Service Unreachable"),
        debug: { ...debug, error: error.message || "Unknown API Error" }
    };
  }
};