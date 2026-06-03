/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getStrategicHint, TargetCandidate, initGeminiClient } from '../services/geminiService';
import { Point, Bubble, Particle, BubbleColor, DebugInfo } from '../types';
import { 
  Loader2, Trophy, BrainCircuit, Play, MousePointerClick, 
  Eye, Terminal, AlertTriangle, Target, Lightbulb, Monitor, 
  Languages, Sparkles, HelpCircle, RefreshCw, Hand, Palette, Zap,
  Check, ArrowRight
} from 'lucide-react';

const PINCH_THRESHOLD = 0.05;
const GRAVITY = 0.0; 
const FRICTION = 0.998; 

const BUBBLE_RADIUS = 22;
const ROW_HEIGHT = BUBBLE_RADIUS * Math.sqrt(3);
const GRID_COLS = 12;
const GRID_ROWS = 8;
const SLINGSHOT_BOTTOM_OFFSET = 220;

const MAX_DRAG_DIST = 180;
const MIN_FORCE_MULT = 0.15;
const MAX_FORCE_MULT = 0.45;

// Material Design Colors & Scoring Strategy
const COLOR_CONFIG: Record<BubbleColor, { hex: string, points: number, label: string }> = {
  red:    { hex: '#ff4b4b', points: 100, label: 'Red' },     
  blue:   { hex: '#00d2ff', points: 150, label: 'Blue' },    
  green:  { hex: '#00e676', points: 200, label: 'Green' },   
  yellow: { hex: '#ffd600', points: 250, label: 'Yellow' },  
  purple: { hex: '#d500f9', points: 300, label: 'Purple' },  
  orange: { hex: '#ff6d00', points: 500, label: 'Orange' }   
};

const COLOR_KEYS: BubbleColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

// Color Helper for Gradients
const adjustColor = (color: string, amount: number) => {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    
    const componentToHex = (c: number) => {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

// Bilingual Dictionaries
const TRANSLATIONS = {
  zh: {
    title: "双指弹弓：AI 战术大师",
    subtitle: "基于 MediaPipe 手势识别与 Google Gemini 2.5 Flash 实时智能战术驱动的泡泡射击游戏",
    author: "创作者：HAPPY Games",
    playGame: "进入游戏",
    howToPlayTitle: "游戏指南 / Gestures Guide",
    howToPlayPinchTitle: "双指捏合射击",
    howToPlayPinchDesc: "在摄像头前举起右手，食指与大拇指捏合并拉动弹弓，松开即可发射。",
    howToPlayColorTitle: "彩色弹药更换",
    howToPlayColorDesc: "点击屏幕下方色彩按钮，可以手动实时切换下一次发射的泡泡弹药颜色。",
    howToPlayAiTitle: "AI 闪电战术",
    howToPlayAiDesc: "利用 Gemini 智能大脑进行视觉分析，为您规划最佳连消路径。支持随时切入人工选择模式，方便网络不佳或额度超限时游戏！",
    prerequisite: "温馨提示：运行前请授予网页摄像头权限。请最大化窗口以获得最佳手势追踪表现。",
    desktopRequired: "需要桌面端浏览器",
    desktopRequiredDesc: "此游戏需要更大的屏幕以支持摄像头手势追踪和游戏操作。",
    maximizeWindow: "请最大化窗口",
    startingEngine: "手势引擎启动中...",
    score: "当前得分",
    highScore: "历史最高",
    selectColor: "选择弹药颜色",
    noAmmo: "弹药耗尽",
    pinchToShoot: "捏合双指并拉动弹弓发射",
    flashStrategy: "AI 闪电战术",
    debugger: "战术调试器",
    status: "运行状态",
    waitingInput: "等待玩家手势中...",
    processingVision: "AI 视觉战术分析中...",
    visionInput: "AI 视觉截图",
    sentToGemini: "发送给 gemini-2.5-flash",
    promptContext: "Prompt 上下文",
    latency: "AI 响应延迟",
    recColor: "推荐颜色",
    rawResponse: "AI 原始响应",
    parsedJson: "解析后的 JSON",
    poweredBy: "基于 Google Gemini 2.5 Flash 强力驱动",
    analyzing: "战术分析中...",
    langButton: "English",
    restartBtn: "重新开始",
    gameOver: "游戏结束！",
    gameOverSub: "泡泡已经触底。您的最终得分是：",
    restart: "重新开始",
    fallbackText: "初始化分析中...",
    aiMode: "AI 战术",
    manualMode: "人工选择",
    aiModeTitle: "智能推荐模式 (自动选弹)",
    manualModeTitle: "人工选择模式 (自主控制)",
  },
  en: {
    title: "slingshot-tactician: AI Master",
    subtitle: "Webcam gesture-controlled bubble shooter powered by Google Gemini 2.5 Flash tactical model",
    author: "Created by HAPPY Games",
    playGame: "Start Game",
    howToPlayTitle: "How to Play / Gestures Guide",
    howToPlayPinchTitle: "Gesture Slingshot",
    howToPlayPinchDesc: "Raise your hand in front of the camera, pinch thumb & index finger to pull the sling, release to fire!",
    howToPlayColorTitle: "Ammunition Select",
    howToPlayColorDesc: "Click the color nodes at the bottom HUD to switch your next projectile bubble ammunition color.",
    howToPlayAiTitle: "Gemini Strategy",
    howToPlayAiDesc: "Activate Google Gemini 2.5 Flash to visually analyze the board and map out target paths. Swap to manual mode anytime if offline.",
    prerequisite: "Prerequisites: Allow camera permissions when prompted. Maximize browser window for best tracking accuracy.",
    desktopRequired: "Desktop View Required",
    desktopRequiredDesc: "This experience requires a larger screen for webcam tracking and game mechanics.",
    maximizeWindow: "Please maximize window",
    startingEngine: "Starting Engine...",
    score: "Score",
    highScore: "High Score",
    selectColor: "Select Color",
    noAmmo: "No ammo",
    pinchToShoot: "Pinch & Pull to Shoot",
    flashStrategy: "Flash Strategy",
    debugger: "Debugger",
    status: "Status",
    waitingInput: "Waiting for Input",
    processingVision: "Processing Vision...",
    visionInput: "Vision Input",
    sentToGemini: "Sent to gemini-2.5-flash",
    promptContext: "Prompt Context",
    latency: "Latency",
    recColor: "Rec. Color",
    rawResponse: "Raw Response Text",
    parsedJson: "Parsed JSON",
    poweredBy: "Powered by Google Gemini 3 Flash",
    analyzing: "ANALYZING...",
    langButton: "中文",
    restartBtn: "Restart Game",
    gameOver: "Game Over!",
    gameOverSub: "The bubbles have reached the bottom limit. Your final score is:",
    restart: "Restart",
    fallbackText: "Initializing tactical model...",
  }
};

const GeminiSlingshot: React.FC = () => {
  // Gameplay States
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [loading, setLoading] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('slingshot_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  
  // Decoupled Game Loop Refs (Runs at 60 FPS)
  const ballPos = useRef<Point>({ x: 0, y: 0 });
  const smoothedHandPos = useRef<Point>({ x: 0, y: 0 });
  const hadHandInPrevFrame = useRef<boolean>(false);
  const ballVel = useRef<Point>({ x: 0, y: 0 });
  const anchorPos = useRef<Point>({ x: 0, y: 0 });
  const isPinching = useRef<boolean>(false);
  const isFlying = useRef<boolean>(false);
  const flightStartTime = useRef<number>(0);
  const bubbles = useRef<Bubble[]>([]);
  const particles = useRef<Particle[]>([]);
  const scoreRef = useRef<number>(0);
  
  const aimTargetRef = useRef<Point | null>(null);
  const isAiThinkingRef = useRef<boolean>(false);
  
  // MediaPipe Cache Refs to decouple tracking frame rates
  const latestImage = useRef<any>(null);
  const latestHandLandmarks = useRef<any>(null);

  // AI Request Trigger
  const captureRequestRef = useRef<boolean>(false);

  // Current active color (Ref for 60 FPS loop, State for UI)
  const selectedColorRef = useRef<BubbleColor>('red');
  
  // React State
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiRationale, setAiRationale] = useState<string | null>(null);
  const [aimTarget, setAimTarget] = useState<Point | null>(null);
  const [score, setScore] = useState(0);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [selectedColor, setSelectedColor] = useState<BubbleColor>('red');
  const [availableColors, setAvailableColors] = useState<BubbleColor[]>([]);
  const [aiRecommendedColor, setAiRecommendedColor] = useState<BubbleColor | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [controlMode, setControlMode] = useState<'ai' | 'manual'>('ai');
  const [showTerms, setShowTerms] = useState(false);
  const [isGateUnlocked, setIsGateUnlocked] = useState(false);
  const [gateStep, setGateStep] = useState<'captcha' | 'terms'>('captcha');
  const [termsTimer, setTermsTimer] = useState(5);
  const [isTermsChecked, setIsTermsChecked] = useState(false);
  const [captchaTargetX, setCaptchaTargetX] = useState(150);
  const [captchaTargetY, setCaptchaTargetY] = useState(50);
  const [sliderValue, setSliderValue] = useState(0);
  const [isCaptchaSuccess, setIsCaptchaSuccess] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const controlModeRef = useRef<'ai' | 'manual'>('ai');

  const t = TRANSLATIONS[lang];

  // Set default hint translation on mount or lang change
  useEffect(() => {
    if (controlMode === 'manual') {
      setAiHint(lang === 'zh' ? "当前处于人工选择模式。请在下方选择弹药颜色并自主瞄准射击。" : "Playing in Manual Mode. Choose ammo below and aim manually.");
    } else if (!aiHint || aiHint.includes("Initializing") || aiHint.includes("初始化")) {
      setAiHint(t.fallbackText);
    }
  }, [lang, controlMode]);

  // Sync state to ref
  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  useEffect(() => {
    aimTargetRef.current = aimTarget;
  }, [aimTarget]);

  useEffect(() => {
    isAiThinkingRef.current = isAiThinking;
  }, [isAiThinking]);

  useEffect(() => {
    controlModeRef.current = controlMode;
  }, [controlMode]);

  // Handle control mode changes on the fly
  useEffect(() => {
    if (controlMode === 'manual') {
      setAiHint(lang === 'zh' ? "当前处于人工选择模式。请在下方选择弹药颜色并自主瞄准射击。" : "Playing in Manual Mode. Choose ammo below and aim manually.");
      setAiRationale(lang === 'zh' ? "AI 战术助手已关闭。此模式下不会消耗 API 额度，且支持离线游玩。" : "AI strategy is deactivated. No API quota is consumed and offline play is supported.");
      setAiRecommendedColor(null);
      setAimTarget(null);
      isAiThinkingRef.current = false;
      setIsAiThinking(false);
      setDebugInfo(null); // Clear errors and debug telemetry on switch
    } else {
      // Re-trigger visual tracking when toggling back to AI
      if (isPlaying && !gameOver) {
        captureRequestRef.current = true;
      }
    }
  }, [controlMode, lang, isPlaying, gameOver]);

  // Load anti-counterfeit signature in console and window
  useEffect(() => {
    console.log(
      "%c%s",
      "color: #d500f9; font-weight: bold; font-size: 14px; background: #0f111a; padding: 8px 16px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;",
      "🚀 SLINGSHOT-TACTICIAN - AUTHORED BY HAPPY GAMES (happy_games@vip.qq.com)\nUnauthorized secondary development or commercial redistribution is strictly prohibited."
    );
    
    try {
      Object.defineProperty(window, '__HAPPY_GAMES_SIGNATURE__', {
        value: 'HAPPY Games (happy_games@vip.qq.com) - Authorized Use Only. Secondary development is strictly prohibited.',
        writable: false,
        configurable: false
      });
    } catch (e) {
      // Ignore if defined
    }
  }, []);

  // CAPTCHA helper functions
  const generateSliderCaptcha = useCallback(() => {
    // Target X should be in the range [100, 210] (canvas width is 280, piece width is 56, visual left is sliderValue + 8)
    const randomX = Math.floor(Math.random() * 111) + 100;
    // Target Y should be in the range [20, 95] to stay fully inside the 155px canvas height
    const randomY = Math.floor(Math.random() * 76) + 20;
    
    setCaptchaTargetX(randomX);
    setCaptchaTargetY(randomY);
    setSliderValue(0);
    setIsCaptchaSuccess(false);
    setCaptchaError(null);
    setGateStep('captcha');
    setTermsTimer(5);
    setIsTermsChecked(false);
  }, []);

  const drawSliderCaptcha = useCallback((targetX: number, targetY: number) => {
    const bgCanvas = document.getElementById('captchaBgCanvas') as HTMLCanvasElement | null;
    const pieceCanvas = document.getElementById('captchaPieceCanvas') as HTMLCanvasElement | null;
    if (!bgCanvas || !pieceCanvas) return;
    
    const bgCtx = bgCanvas.getContext('2d');
    const pieceCtx = pieceCanvas.getContext('2d');
    if (!bgCtx || !pieceCtx) return;
    
    const w = bgCanvas.width;
    const h = bgCanvas.height;
    
    // Clear and draw gradient background
    const grad = bgCtx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0a0c14');
    grad.addColorStop(1, '#151a30');
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, w, h);

    // Cyber Grid
    bgCtx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
    bgCtx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < w; x += gridSize) {
      bgCtx.beginPath();
      bgCtx.moveTo(x, 0);
      bgCtx.lineTo(x, h);
      bgCtx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      bgCtx.beginPath();
      bgCtx.moveTo(0, y);
      bgCtx.lineTo(w, y);
      bgCtx.stroke();
    }

    // Watermark text
    bgCtx.font = 'bold 8px "Share Tech Mono", monospace';
    bgCtx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    bgCtx.textAlign = 'center';
    bgCtx.fillText('HAPPY GAMES SECURITY SYSTEM', w / 2, 20);
    bgCtx.fillText('UNAUTHORIZED DEV PROHIBITED', w / 2, h - 12);

    // Mini Slingshot
    bgCtx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    bgCtx.lineWidth = 3;
    bgCtx.beginPath();
    bgCtx.moveTo(w / 2 - 15, h - 10);
    bgCtx.lineTo(w / 2 - 15, h - 30);
    bgCtx.lineTo(w / 2 - 30, h - 45);
    bgCtx.moveTo(w / 2 + 15, h - 10);
    bgCtx.lineTo(w / 2 + 15, h - 30);
    bgCtx.lineTo(w / 2 + 30, h - 45);
    bgCtx.stroke();

    // Mini Slingshot rubber band
    bgCtx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
    bgCtx.lineWidth = 1.5;
    bgCtx.beginPath();
    bgCtx.moveTo(w / 2 - 30, h - 45);
    bgCtx.lineTo(w / 2, h - 25);
    bgCtx.lineTo(w / 2 + 30, h - 45);
    bgCtx.stroke();

    // 6 Neon bubbles
    const bubbleColors = [
      { fill: 'rgba(244, 63, 94, 0.75)', stroke: '#f43f5e' }, // red
      { fill: 'rgba(16, 185, 129, 0.75)', stroke: '#10b981' }, // green
      { fill: 'rgba(59, 130, 246, 0.75)', stroke: '#3b82f6' }, // blue
      { fill: 'rgba(245, 158, 11, 0.75)', stroke: '#f59e0b' }, // orange
      { fill: 'rgba(168, 85, 247, 0.75)', stroke: '#a855f7' }, // purple
      { fill: 'rgba(6, 182, 212, 0.75)', stroke: '#06b6d4' }  // cyan
    ];

    const bubblePositions = [
      { x: 40, y: 35, r: 12, color: bubbleColors[0] },
      { x: 80, y: 65, r: 10, color: bubbleColors[1] },
      { x: 220, y: 40, r: 11, color: bubbleColors[2] },
      { x: 170, y: 75, r: 13, color: bubbleColors[3] },
      { x: 120, y: 110, r: 9, color: bubbleColors[4] },
      { x: 240, y: 115, r: 11, color: bubbleColors[5] }
    ];

    bubblePositions.forEach(b => {
      bgCtx.shadowColor = b.color.stroke;
      bgCtx.shadowBlur = 8;
      bgCtx.fillStyle = b.color.fill;
      bgCtx.beginPath();
      bgCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      bgCtx.fill();

      bgCtx.strokeStyle = b.color.stroke;
      bgCtx.lineWidth = 1.5;
      bgCtx.beginPath();
      bgCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      bgCtx.stroke();

      bgCtx.shadowBlur = 0; // reset
      bgCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      bgCtx.beginPath();
      bgCtx.arc(b.x - b.r / 3, b.y - b.r / 3, b.r / 4, 0, Math.PI * 2);
      bgCtx.fill();
    });

    // 2. Prepare the puzzle piece canvas
    const pSize = 36;
    const pRadius = 6;
    const lX = 8;
    const lY = 8;
    
    // Clear piece canvas
    pieceCtx.clearRect(0, 0, pieceCanvas.width, pieceCanvas.height);
    
    // Helper to draw path
    const getPath = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      // Top side
      ctx.lineTo(x + pSize / 2 - pRadius, y);
      ctx.arc(x + pSize / 2, y, pRadius, Math.PI, 0, false);
      ctx.lineTo(x + pSize, y);
      // Right side
      ctx.lineTo(x + pSize, y + pSize / 2 - pRadius);
      ctx.arc(x + pSize, y + pSize / 2, pRadius, -Math.PI / 2, Math.PI / 2, false);
      ctx.lineTo(x + pSize, y + pSize);
      // Bottom side
      ctx.lineTo(x + pSize / 2 + pRadius, y + pSize);
      ctx.arc(x + pSize / 2, y + pSize, pRadius, 0, Math.PI, false);
      ctx.lineTo(x, y + pSize);
      // Left side
      ctx.lineTo(x, y + pSize / 2 + pRadius);
      ctx.arc(x, y + pSize / 2, pRadius, Math.PI / 2, -Math.PI / 2, true); // indentation
      ctx.lineTo(x, y);
      ctx.closePath();
    };
    
    // Clip the pieceCtx to the puzzle path
    getPath(pieceCtx, lX, lY);
    pieceCtx.clip();
    
    // Crop the background image from bgCanvas into the pieceCanvas
    pieceCtx.drawImage(
      bgCanvas, 
      targetX - lX, 
      targetY - lY, 
      pieceCanvas.width, 
      pieceCanvas.height, 
      0, 
      0, 
      pieceCanvas.width, 
      pieceCanvas.height
    );
    
    pieceCtx.restore();
    
    // Add a glowing purple border to the puzzle piece
    pieceCtx.save();
    getPath(pieceCtx, lX, lY);
    pieceCtx.strokeStyle = '#8b5cf6';
    pieceCtx.lineWidth = 2;
    pieceCtx.shadowColor = '#8b5cf6';
    pieceCtx.shadowBlur = 6;
    pieceCtx.stroke();
    pieceCtx.restore();
    
    // 3. Draw the dark cutout shadow of the puzzle piece on the bgCanvas at (targetX, targetY)
    bgCtx.save();
    getPath(bgCtx, targetX, targetY);
    bgCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    bgCtx.fill();
    bgCtx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
    bgCtx.lineWidth = 1.5;
    bgCtx.shadowColor = 'rgba(99, 102, 241, 0.3)';
    bgCtx.shadowBlur = 4;
    bgCtx.stroke();
    bgCtx.restore();
  }, []);

  // Draw captcha when gate loads (if not unlocked) and coordinates change
  useEffect(() => {
    if (!isGateUnlocked && gateStep === 'captcha') {
      const timer = setTimeout(() => drawSliderCaptcha(captchaTargetX, captchaTargetY), 50);
      return () => clearTimeout(timer);
    }
  }, [isGateUnlocked, gateStep, captchaTargetX, captchaTargetY, drawSliderCaptcha]);

  const handleVerifySlider = () => {
    const targetVal = captchaTargetX - 8;
    const diff = Math.abs(sliderValue - targetVal);
    
    if (diff <= 6) { // 6px tolerance
      setIsCaptchaSuccess(true);
      setCaptchaError(null);
      setTimeout(() => {
        setGateStep('terms');
        setTermsTimer(5);
      }, 700);
    } else {
      setCaptchaError(lang === 'zh' ? '拼图未对齐，请重试！' : 'Not aligned, please try again.');
      generateSliderCaptcha();
    }
  };

  // Terms countdown timer
  useEffect(() => {
    if (isGateUnlocked || gateStep !== 'terms' || termsTimer <= 0) return;
    const interval = setInterval(() => {
      setTermsTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGateUnlocked, gateStep, termsTimer]);

  // Initial captcha load on mount
  useEffect(() => {
    if (!isGateUnlocked) {
      generateSliderCaptcha();
    }
  }, [isGateUnlocked, generateSliderCaptcha]);
  
  const getBubblePos = (row: number, col: number, width: number) => {
    const xOffset = (width - (GRID_COLS * BUBBLE_RADIUS * 2)) / 2 + BUBBLE_RADIUS;
    const isOdd = row % 2 !== 0;
    const x = xOffset + col * (BUBBLE_RADIUS * 2) + (isOdd ? BUBBLE_RADIUS : 0);
    const y = BUBBLE_RADIUS + row * ROW_HEIGHT;
    return { x, y };
  };

  const updateAvailableColors = () => {
    const activeColors = new Set<BubbleColor>();
    bubbles.current.forEach(b => {
        if (b.active) activeColors.add(b.color);
    });
    setAvailableColors(Array.from(activeColors));
    
    // If current selected color is gone, switch to first available
    if (!activeColors.has(selectedColorRef.current) && activeColors.size > 0) {
        const next = Array.from(activeColors)[0];
        setSelectedColor(next);
    }
  };

  const initGrid = useCallback((width: number) => {
    const newBubbles: Bubble[] = [];
    for (let r = 0; r < 5; r++) { 
      for (let c = 0; c < (r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS); c++) {
        if (Math.random() > 0.08) {
            const { x, y } = getBubblePos(r, c, width);
            newBubbles.push({
              id: `${r}-${c}`,
              row: r,
              col: c,
              x,
              y,
              color: COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)],
              active: true
            });
        }
      }
    }
    bubbles.current = newBubbles;
    updateAvailableColors();
    
    // Trigger initial AI analysis after a short delay to allow render
    setTimeout(() => {
        captureRequestRef.current = true;
    }, 2000);
  }, []);

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 18; i++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14,
        life: 1.0,
        color
      });
    }
  };

  const isPathClear = (target: Bubble) => {
    if (!anchorPos.current) return false;
    
    const startX = anchorPos.current.x;
    const startY = anchorPos.current.y;
    const endX = target.x;
    const endY = target.y;

    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(distance / (BUBBLE_RADIUS / 2)); 

    for (let i = 1; i < steps - 2; i++) { 
        const stepRatio = i / steps;
        const cx = startX + dx * stepRatio;
        const cy = startY + dy * stepRatio;

        for (const b of bubbles.current) {
            if (!b.active || b.id === target.id) continue;
            const distSq = Math.pow(cx - b.x, 2) + Math.pow(cy - b.y, 2);
            if (distSq < Math.pow(BUBBLE_RADIUS * 1.8, 2)) {
                return false; 
            }
        }
    }
    return true;
  };

  const getAllReachableClusters = (): TargetCandidate[] => {
    const activeBubbles = bubbles.current.filter(b => b.active);
    const uniqueColors = Array.from(new Set(activeBubbles.map(b => b.color))) as BubbleColor[];
    const allClusters: TargetCandidate[] = [];

    // Analyze opportunities for ALL colors
    for (const color of uniqueColors) {
        const visited = new Set<string>();
        
        for (const b of activeBubbles) {
            if (b.color !== color || visited.has(b.id)) continue;

            const clusterMembers: Bubble[] = [];
            const queue = [b];
            visited.add(b.id);

            while (queue.length > 0) {
                const curr = queue.shift()!;
                clusterMembers.push(curr);
                
                const neighbors = activeBubbles.filter(n => 
                    !visited.has(n.id) && n.color === color && isNeighbor(curr, n)
                );
                neighbors.forEach(n => {
                    visited.add(n.id);
                    queue.push(n);
                });
            }

            // Check if this cluster is hittable
            clusterMembers.sort((a,b) => b.y - a.y); 
            const hittableMember = clusterMembers.find(m => isPathClear(m));

            if (hittableMember) {
                const xPct = hittableMember.x / (gameContainerRef.current?.clientWidth || window.innerWidth);
                let desc = "Center";
                if (xPct < 0.33) desc = "Left";
                else if (xPct > 0.66) desc = "Right";

                allClusters.push({
                    id: hittableMember.id,
                    color: color,
                    size: clusterMembers.length,
                    row: hittableMember.row,
                    col: hittableMember.col,
                    pointsPerBubble: COLOR_CONFIG[color].points,
                    description: `${desc}`
                });
            }
        }
    }
    return allClusters;
  };

  const checkMatches = (startBubble: Bubble) => {
    const toCheck = [startBubble];
    const visited = new Set<string>();
    const matches: Bubble[] = [];
    const targetColor = startBubble.color;

    while (toCheck.length > 0) {
      const current = toCheck.pop()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      if (current.color === targetColor) {
        matches.push(current);
        const neighbors = bubbles.current.filter(b => b.active && !visited.has(b.id) && isNeighbor(current, b));
        toCheck.push(...neighbors);
      }
    }

    if (matches.length >= 3) {
      let points = 0;
      const basePoints = COLOR_CONFIG[targetColor].points;
      
      matches.forEach(b => {
        b.active = false;
        createExplosion(b.x, b.y, COLOR_CONFIG[b.color].hex);
        points += basePoints;
      });
      // Combo Multiplier
      const multiplier = matches.length > 3 ? 1.5 : 1.0;
      const finalScore = Math.floor(points * multiplier);
      scoreRef.current += finalScore;
      setScore(scoreRef.current);
      
      // Update high score
      if (scoreRef.current > highScore) {
        setHighScore(scoreRef.current);
        localStorage.setItem('slingshot_highscore', scoreRef.current.toString());
      }
      return true;
    }
    return false;
  };

  // Drop Floating Bubbles that lose connection to the ceiling (row == 0)
  const dropFloatingBubbles = () => {
    const activeBubbles = bubbles.current.filter(b => b.active);
    if (activeBubbles.length === 0) return;

    const connected = new Set<string>();
    const queue: Bubble[] = activeBubbles.filter(b => b.row === 0);
    queue.forEach(b => connected.add(b.id));

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const neighbors = activeBubbles.filter(n => !connected.has(n.id) && isNeighbor(curr, n));
      neighbors.forEach(n => {
        connected.add(n.id);
        queue.push(n);
      });
    }

    // Drop bubbles that are not connected
    let dropCount = 0;
    activeBubbles.forEach(b => {
      if (!connected.has(b.id)) {
        b.active = false;
        dropCount++;
        createExplosion(b.x, b.y, COLOR_CONFIG[b.color].hex);
        scoreRef.current += Math.floor(COLOR_CONFIG[b.color].points * 1.5); // Bonus score for drops!
      }
    });

    if (dropCount > 0) {
      setScore(scoreRef.current);
      if (scoreRef.current > highScore) {
        setHighScore(scoreRef.current);
        localStorage.setItem('slingshot_highscore', scoreRef.current.toString());
      }
    }
  };

  const isNeighbor = (a: Bubble, b: Bubble) => {
    const dr = b.row - a.row;
    const dc = b.col - a.col;
    if (Math.abs(dr) > 1) return false;
    if (dr === 0) return Math.abs(dc) === 1;
    if (a.row % 2 !== 0) {
        return dc === 0 || dc === 1;
    } else {
        return dc === -1 || dc === 0;
    }
  };

  const performAiAnalysis = async (screenshot: string) => {
    // If the user has switched to manual mode, do not proceed with AI analysis
    if (controlModeRef.current === 'manual') {
      isAiThinkingRef.current = false;
      setIsAiThinking(false);
      return;
    }

    // Lock interaction immediately via ref (fast) and state (render)
    isAiThinkingRef.current = true;
    setIsAiThinking(true);
    setAiHint(t.processingVision);
    setAiRationale(null);
    setAiRecommendedColor(null);
    setAimTarget(null);

    // Client-Side Pre-Calc for ALL colors
    const allClusters = getAllReachableClusters();
    const maxRow = bubbles.current.reduce((max, b) => b.active ? Math.max(max, b.row) : max, 0);

    const canvasWidth = canvasRef.current?.width || 1000;

    getStrategicHint(
        screenshot,
        allClusters,
        maxRow,
        lang // Fully adapt to selected language
    ).then(aiResponse => {
        // Discard result if user switched to manual mode in the meantime
        if (controlModeRef.current === 'manual') {
            isAiThinkingRef.current = false;
            setIsAiThinking(false);
            return;
        }

        const { hint, debug } = aiResponse;
        setDebugInfo(debug);
        setAiHint(hint.message);
        setAiRationale(hint.rationale || null);
        
        if (typeof hint.targetRow === 'number' && typeof hint.targetCol === 'number') {
            if (hint.recommendedColor) {
                setAiRecommendedColor(hint.recommendedColor);
                setSelectedColor(hint.recommendedColor); // Auto-equip recommendation
            }
            const pos = getBubblePos(hint.targetRow, hint.targetCol, canvasWidth);
            setAimTarget(pos);
        }
        
        // Unlock
        isAiThinkingRef.current = false;
        setIsAiThinking(false);
    });
  };

  // Real-time Bouncing Trajectory Predictor for dragging/manual aim
  const getTrajectoryPoints = (): Point[] => {
    const points: Point[] = [];
    if (!canvasRef.current) return points;
    const canvas = canvasRef.current;
    
    // Start at current bubble drag position
    let pX = ballPos.current.x;
    let pY = ballPos.current.y;
    
    const dx = anchorPos.current.x - pX;
    const dy = anchorPos.current.y - pY;
    const stretchDist = Math.sqrt(dx * dx + dy * dy);
    
    if (stretchDist <= 25) {
      return points; // Insufficient pull, don't show trajectory
    }
    
    const powerRatio = Math.min(stretchDist / MAX_DRAG_DIST, 1.0);
    const velocityMultiplier = MIN_FORCE_MULT + (MAX_FORCE_MULT - MIN_FORCE_MULT) * (powerRatio * powerRatio);
    
    let vX = dx * velocityMultiplier;
    let vY = dy * velocityMultiplier;
    
    const gridWidth = GRID_COLS * BUBBLE_RADIUS * 2;
    const xMin = (canvas.width - gridWidth) / 2;
    const xMax = canvas.width - xMin;
    
    points.push({ x: pX, y: pY });
    
    let collision = false;
    const maxSimulationSteps = 160;
    
    for (let step = 0; step < maxSimulationSteps; step++) {
      const speed = Math.sqrt(vX * vX + vY * vY);
      const subSteps = Math.ceil(speed / (BUBBLE_RADIUS * 0.8));
      
      for (let s = 0; s < subSteps; s++) {
        pX += vX / subSteps;
        pY += vY / subSteps;
        
        // Wall Rebound Bounce
        if (pX < xMin + BUBBLE_RADIUS || pX > xMax - BUBBLE_RADIUS) {
          vX *= -1;
          pX = Math.max(xMin + BUBBLE_RADIUS, Math.min(xMax - BUBBLE_RADIUS, pX));
          points.push({ x: pX, y: pY }); // Insert bounce pivot point
        }
        
        // Ceiling impact
        if (pY < BUBBLE_RADIUS) {
          collision = true;
          break;
        }
        
        // Active bubble collision
        for (const b of bubbles.current) {
          if (!b.active) continue;
          const dist = Math.sqrt((pX - b.x) ** 2 + (pY - b.y) ** 2);
          if (dist < BUBBLE_RADIUS * 1.8) {
            collision = true;
            break;
          }
        }
        
        if (collision) break;
      }
      
      if (collision) {
        points.push({ x: pX, y: pY });
        break;
      }
      
      vX *= FRICTION;
      vY *= FRICTION;
      
      if (step % 2 === 0) {
        points.push({ x: pX, y: pY });
      }
    }
    
    return points;
  };

  // --- Rendering Helper ---
  const drawBubble = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, colorKey: BubbleColor) => {
    const config = COLOR_CONFIG[colorKey];
    const baseColor = config.hex;
    
    // Main Sphere Gradient (gives 3D depth)
    const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
    grad.addColorStop(0, '#ffffff');             
    grad.addColorStop(0.2, baseColor);           
    grad.addColorStop(1, adjustColor(baseColor, -70)); 

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle Outline for definition
    ctx.strokeStyle = adjustColor(baseColor, -90);
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Secondary "Glossy" Highlight (Hard reflection)
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.3, y - radius * 0.35, radius * 0.25, radius * 0.15, Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fill();
  };

  // Restarts the game
  const handleRestart = () => {
    scoreRef.current = 0;
    setScore(0);
    setGameOver(false);
    setAiHint(t.startingEngine);
    setAiRationale(null);
    setAiRecommendedColor(null);
    setAimTarget(null);
    if (canvasRef.current) {
      initGrid(canvasRef.current.width);
    }
  };

  // --- Main Game Loop (Decoupled & Optimized to 60 FPS) ---
  useEffect(() => {
    if (!isPlaying) return;
    if (!videoRef.current || !canvasRef.current || !gameContainerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = gameContainerRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    // Set initial size based on container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    anchorPos.current = { x: canvas.width / 2, y: canvas.height - SLINGSHOT_BOTTOM_OFFSET };
    ballPos.current = { ...anchorPos.current };
    
    initGrid(canvas.width);

    let animationFrameId: number;
    let camera: any = null;
    let hands: any = null;

    // --- Dedicated 60 FPS Anim Tick ---
    const tick = () => {
      // Responsive Resize
      if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        anchorPos.current = { x: canvas.width / 2, y: canvas.height - SLINGSHOT_BOTTOM_OFFSET };
        if (!isFlying.current && !isPinching.current) {
          ballPos.current = { ...anchorPos.current };
        }
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Video Feed mirrored
      if (latestImage.current) {
        ctx.drawImage(latestImage.current, 0, 0, canvas.width, canvas.height);
        // Matte Premium Dark Glass Overlay
        ctx.fillStyle = 'rgba(10, 11, 14, 0.88)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Fallback space theme gradient if camera not fully loaded
        const spaceGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        spaceGrad.addColorStop(0, '#0a0b0e');
        spaceGrad.addColorStop(1, '#131520');
        ctx.fillStyle = spaceGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Tech grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        const gridSpacing = 40;
        for (let x = 0; x < canvas.width; x += gridSpacing) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSpacing) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
      }

      // Deep Anti-counterfeit Digital Watermark (Faint background text)
      ctx.save();
      ctx.globalAlpha = 0.045; // Faint but clearly present
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Share Tech Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('AUTHORIZED BY HAPPY GAMES', canvas.width - 25, canvas.height - 25);
      ctx.textAlign = 'left';
      ctx.fillText('HAPPY_GAMES@VIP.QQ.COM - NO COPY', 25, canvas.height - 25);
      ctx.restore();

      // Draw Glowing Neon Laser Boundaries
      const gridWidth = GRID_COLS * BUBBLE_RADIUS * 2;
      const xMin = (canvas.width - gridWidth) / 2;
      const xMax = canvas.width - xMin;

      ctx.save();
      // Glowing neon visual parameters
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)'; // Subtly glowing Indigo border
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#6366f1';
      ctx.setLineDash([8, 8]);
      
      // Draw Left Laser Barrier
      ctx.beginPath();
      ctx.moveTo(xMin, 0);
      ctx.lineTo(xMin, canvas.height);
      ctx.stroke();

      // Draw Right Laser Barrier
      ctx.beginPath();
      ctx.moveTo(xMax, 0);
      ctx.lineTo(xMax, canvas.height);
      ctx.stroke();
      
      ctx.restore();

      // Read gesture landmarks cached in refs
      let handPos: Point | null = null;
      let pinchDist = 1.0;
      const landmarks = latestHandLandmarks.current;

      if (landmarks) {
        const idxTip = landmarks[8];
        const thumbTip = landmarks[4];

        const rawHandX = (idxTip.x * canvas.width + thumbTip.x * canvas.width) / 2;
        const rawHandY = (idxTip.y * canvas.height + thumbTip.y * canvas.height) / 2;

        if (!hadHandInPrevFrame.current) {
          // Snap immediately on first frame of detection to avoid lag
          smoothedHandPos.current = { x: rawHandX, y: rawHandY };
          hadHandInPrevFrame.current = true;
        } else {
          // Apply low-pass filter to absorb high-frequency camera detection jitter
          const lerpFactor = 0.22;
          smoothedHandPos.current.x += (rawHandX - smoothedHandPos.current.x) * lerpFactor;
          smoothedHandPos.current.y += (rawHandY - smoothedHandPos.current.y) * lerpFactor;
        }

        handPos = {
          x: smoothedHandPos.current.x,
          y: smoothedHandPos.current.y
        };

        const dx = idxTip.x - thumbTip.x;
        const dy = idxTip.y - thumbTip.y;
        pinchDist = Math.sqrt(dx * dx + dy * dy);

        if (window.drawConnectors && window.drawLandmarks) {
           // Elegant cyber-violet connectors
           window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {color: 'rgba(124, 58, 237, 0.3)', lineWidth: 1.5});
           window.drawLandmarks(ctx, landmarks, {color: '#8b5cf6', lineWidth: 1, radius: 2.5});
        }
        
        // Beautiful pulsating cursor ring
        ctx.beginPath();
        ctx.arc(handPos.x, handPos.y, 22, 0, Math.PI * 2);
        ctx.strokeStyle = pinchDist < PINCH_THRESHOLD ? '#10b981' : 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = pinchDist < PINCH_THRESHOLD ? 3 : 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(handPos.x, handPos.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = pinchDist < PINCH_THRESHOLD ? '#10b981' : '#ffffff';
        ctx.fill();
      } else {
        hadHandInPrevFrame.current = false;
      }
      
      // --- SLINGSHOT ENGINE LOGIC ---
      const isLocked = isAiThinkingRef.current;

      if (!isLocked && handPos && pinchDist < PINCH_THRESHOLD && !isFlying.current) {
        const distToBall = Math.sqrt(Math.pow(handPos.x - ballPos.current.x, 2) + Math.pow(handPos.y - ballPos.current.y, 2));
        if (!isPinching.current && distToBall < 110) {
           isPinching.current = true;
        }
        
        if (isPinching.current) {
            ballPos.current = { x: handPos.x, y: handPos.y };
            const dragDx = ballPos.current.x - anchorPos.current.x;
            const dragDy = ballPos.current.y - anchorPos.current.y;
            const dragDist = Math.sqrt(dragDx*dragDx + dragDy*dragDy);
            
            if (dragDist > MAX_DRAG_DIST) {
                const angle = Math.atan2(dragDy, dragDx);
                ballPos.current.x = anchorPos.current.x + Math.cos(angle) * MAX_DRAG_DIST;
                ballPos.current.y = anchorPos.current.y + Math.sin(angle) * MAX_DRAG_DIST;
            }

            // Emit subtle drag trailing speed-dust
            if (Math.random() < 0.35) {
              particles.current.push({
                x: ballPos.current.x + (Math.random() - 0.5) * 16,
                y: ballPos.current.y + (Math.random() - 0.5) * 16,
                vx: -dragDx * 0.02 + (Math.random() - 0.5) * 1.5,
                vy: -dragDy * 0.02 + (Math.random() - 0.5) * 1.5,
                life: 0.6,
                color: 'rgba(255,255,255,0.15)'
              });
            }
        }
      } 
      else if (isPinching.current && (!handPos || pinchDist >= PINCH_THRESHOLD || isLocked)) {
        isPinching.current = false;
        
        if (isLocked) {
             ballPos.current = { ...anchorPos.current };
        } else {
            const dx = anchorPos.current.x - ballPos.current.x;
            const dy = anchorPos.current.y - ballPos.current.y;
            const stretchDist = Math.sqrt(dx*dx + dy*dy);
            
            if (stretchDist > 30) {
                isFlying.current = true;
                flightStartTime.current = performance.now();
                const powerRatio = Math.min(stretchDist / MAX_DRAG_DIST, 1.0);
                const velocityMultiplier = MIN_FORCE_MULT + (MAX_FORCE_MULT - MIN_FORCE_MULT) * (powerRatio * powerRatio);

                ballVel.current = {
                    x: dx * velocityMultiplier,
                    y: dy * velocityMultiplier
                };

                // Big launch particles!
                const launchColor = COLOR_CONFIG[selectedColorRef.current].hex;
                for (let k = 0; k < 12; k++) {
                  particles.current.push({
                    x: ballPos.current.x,
                    y: ballPos.current.y,
                    vx: -dx * 0.04 + (Math.random() - 0.5) * 7,
                    vy: -dy * 0.04 + (Math.random() - 0.5) * 7,
                    life: 0.7,
                    color: launchColor
                  });
                }
            } else {
                ballPos.current = { ...anchorPos.current };
            }
        }
      }
      else if (!isFlying.current && !isPinching.current) {
          const dx = anchorPos.current.x - ballPos.current.x;
          const dy = anchorPos.current.y - ballPos.current.y;
          ballPos.current.x += dx * 0.15;
          ballPos.current.y += dy * 0.15;
      }

      // --- Physics ---
      if (isFlying.current) {
        if (performance.now() - flightStartTime.current > 5000) {
            isFlying.current = false;
            ballPos.current = { ...anchorPos.current };
            ballVel.current = { x: 0, y: 0 };
        } else {
            const currentSpeed = Math.sqrt(ballVel.current.x ** 2 + ballVel.current.y ** 2);
            const steps = Math.ceil(currentSpeed / (BUBBLE_RADIUS * 0.8)); 
            let collisionOccurred = false;

            for (let i = 0; i < steps; i++) {
                ballPos.current.x += ballVel.current.x / steps;
                ballPos.current.y += ballVel.current.y / steps;
                
                const gridWidth = GRID_COLS * BUBBLE_RADIUS * 2;
                const xMin = (canvas.width - gridWidth) / 2;
                const xMax = canvas.width - xMin;

                if (ballPos.current.x < xMin + BUBBLE_RADIUS || ballPos.current.x > xMax - BUBBLE_RADIUS) {
                    ballVel.current.x *= -1;
                    ballPos.current.x = Math.max(xMin + BUBBLE_RADIUS, Math.min(xMax - BUBBLE_RADIUS, ballPos.current.x));
                }

                if (ballPos.current.y < BUBBLE_RADIUS) {
                    collisionOccurred = true;
                    break;
                }

                for (const b of bubbles.current) {
                    if (!b.active) continue;
                    const dist = Math.sqrt(
                        Math.pow(ballPos.current.x - b.x, 2) + 
                        Math.pow(ballPos.current.y - b.y, 2)
                    );
                    if (dist < BUBBLE_RADIUS * 1.8) { 
                        collisionOccurred = true;
                        break;
                    }
                }
                if (collisionOccurred) break;
            }

            ballVel.current.y += GRAVITY; 
            ballVel.current.x *= FRICTION;
            ballVel.current.y *= FRICTION;

            // Spawn fine trailing particles
            if (Math.random() < 0.45) {
              particles.current.push({
                x: ballPos.current.x,
                y: ballPos.current.y,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 0.5,
                color: COLOR_CONFIG[selectedColorRef.current].hex
              });
            }

            if (collisionOccurred) {
                isFlying.current = false;
                
                let bestDist = Infinity;
                let bestRow = 0;
                let bestCol = 0;
                let bestX = 0;
                let bestY = 0;

                for (let r = 0; r < GRID_ROWS + 5; r++) {
                    const colsInRow = r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
                    for (let c = 0; c < colsInRow; c++) {
                        const { x, y } = getBubblePos(r, c, canvas.width);
                        const occupied = bubbles.current.some(b => b.active && b.row === r && b.col === c);
                        if (occupied) continue;

                        const dist = Math.sqrt(
                            Math.pow(ballPos.current.x - x, 2) + 
                            Math.pow(ballPos.current.y - y, 2)
                        );
                        
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestRow = r;
                            bestCol = c;
                            bestX = x;
                            bestY = y;
                        }
                    }
                }

                const newBubble: Bubble = {
                    id: `${bestRow}-${bestCol}-${Date.now()}`,
                    row: bestRow,
                    col: bestCol,
                    x: bestX,
                    y: bestY,
                    color: selectedColorRef.current,
                    active: true
                };
                bubbles.current.push(newBubble);
                checkMatches(newBubble);
                dropFloatingBubbles();
                updateAvailableColors();

                // Check Game Over
                const currentMaxRow = bubbles.current.reduce((max, b) => b.active ? Math.max(max, b.row) : max, 0);
                if (currentMaxRow >= GRID_ROWS) {
                  setGameOver(true);
                }
                
                // Reset shot
                ballPos.current = { ...anchorPos.current };
                ballVel.current = { x: 0, y: 0 };

                // Request AI Analysis for next frame
                captureRequestRef.current = true;
            }
            
            if (ballPos.current.y > canvas.height) {
                isFlying.current = false;
                ballPos.current = { ...anchorPos.current };
                ballVel.current = { x: 0, y: 0 };
            }
        }
      }

      // --- Drawing ---
      
      // Draw Grid Bubbles
      bubbles.current.forEach(b => {
          if (!b.active) return;
          drawBubble(ctx, b.x, b.y, BUBBLE_RADIUS - 1, b.color);
      });

      // Laser Sight & Bouncing Trajectory Line
      const currentAimTarget = aimTargetRef.current;
      const thinking = isAiThinkingRef.current;
      const currentSelected = selectedColorRef.current;

      if (isPinching.current) {
          // Draw real-time bouncing trajectory line when dragging
          const trajectoryPoints = getTrajectoryPoints();
          if (trajectoryPoints.length > 1) {
              ctx.save();
              const highlightColor = COLOR_CONFIG[currentSelected].hex;
              
              ctx.shadowBlur = 18;
              ctx.shadowColor = highlightColor;
              
              ctx.beginPath();
              ctx.moveTo(trajectoryPoints[0].x, trajectoryPoints[0].y);
              for (let i = 1; i < trajectoryPoints.length; i++) {
                  ctx.lineTo(trajectoryPoints[i].x, trajectoryPoints[i].y);
              }
              
              const time = performance.now();
              const dashOffset = (time / 14) % 30;
              ctx.setLineDash([20, 15]);
              ctx.lineDashOffset = -dashOffset;
              
              ctx.strokeStyle = highlightColor;
              ctx.lineWidth = 4;
              ctx.stroke();
              
              // Draw landing indicator ring at the end of the trajectory
              const lastPt = trajectoryPoints[trajectoryPoints.length - 1];
              ctx.beginPath();
              ctx.arc(lastPt.x, lastPt.y, BUBBLE_RADIUS + 4, 0, Math.PI * 2);
              ctx.setLineDash([4, 4]);
              ctx.strokeStyle = highlightColor;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
              ctx.fill();
              ctx.stroke();
              
              ctx.beginPath();
              ctx.arc(lastPt.x, lastPt.y, 4, 0, Math.PI * 2);
              ctx.fillStyle = highlightColor;
              ctx.fill();
              
              ctx.restore();
          }
      } else {
          // Draw static AI hint targeting line when at rest
          const shouldShowLine = currentAimTarget && !isFlying.current && 
                                 (!aiRecommendedColor || aiRecommendedColor === currentSelected);

          if (shouldShowLine || thinking) {
              ctx.save();
              const highlightColor = thinking ? '#818cf8' : COLOR_CONFIG[currentSelected].hex; 
              
              ctx.shadowBlur = 18;
              ctx.shadowColor = highlightColor;
              
              ctx.beginPath();
              ctx.moveTo(anchorPos.current.x, anchorPos.current.y);
              if (currentAimTarget) {
                ctx.lineTo(currentAimTarget.x, currentAimTarget.y);
              } else {
                ctx.lineTo(anchorPos.current.x, anchorPos.current.y - 200);
              }
              
              const time = performance.now();
              const dashOffset = (time / 14) % 30;
              ctx.setLineDash([20, 15]);
              ctx.lineDashOffset = -dashOffset;
              
              ctx.strokeStyle = thinking ? 'rgba(129, 140, 248, 0.4)' : highlightColor;
              ctx.lineWidth = 4;
              ctx.stroke();
              
              if (currentAimTarget && !thinking) {
                  ctx.beginPath();
                  ctx.arc(currentAimTarget.x, currentAimTarget.y, BUBBLE_RADIUS + 4, 0, Math.PI * 2);
                  ctx.setLineDash([4, 4]);
                  ctx.strokeStyle = highlightColor;
                  ctx.fillStyle = 'rgba(255,255,255,0.08)';
                  ctx.fill();
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.arc(currentAimTarget.x, currentAimTarget.y, 4, 0, Math.PI * 2);
                  ctx.fillStyle = highlightColor;
                  ctx.fill();
              }
              
              ctx.restore();
          }
      }
      
      // Slingshot Band (Back)
      const stretchDx = ballPos.current.x - anchorPos.current.x;
      const stretchDy = ballPos.current.y - anchorPos.current.y;
      const stretchDist = Math.sqrt(stretchDx*stretchDx + stretchDy*stretchDy);
      const stretchPct = Math.min(stretchDist / MAX_DRAG_DIST, 1.0);

      if (!isFlying.current) {
        ctx.save();
        const dynamicColor = ctx.createLinearGradient(anchorPos.current.x - 45, anchorPos.current.y - 15, ballPos.current.x, ballPos.current.y);
        dynamicColor.addColorStop(0, '#6366f1'); 
        dynamicColor.addColorStop(1, isPinching.current ? `hsl(${70 - stretchPct * 70}, 100%, 60%)` : '#a5b4fc');

        ctx.shadowBlur = 8;
        ctx.shadowColor = '#6366f1';
        ctx.beginPath();
        ctx.moveTo(anchorPos.current.x - 45, anchorPos.current.y - 15);
        ctx.lineTo(ballPos.current.x, ballPos.current.y);
        ctx.lineWidth = isPinching.current ? Math.max(3, 7 * (1 - stretchPct * 0.4)) : 7;
        ctx.strokeStyle = dynamicColor;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      }

      // Draw Projectile Ball
      ctx.save();
      if (isLocked && !isFlying.current) {
          ctx.globalAlpha = 0.4;
      }
      drawBubble(ctx, ballPos.current.x, ballPos.current.y, BUBBLE_RADIUS, selectedColorRef.current);
      ctx.restore();

      // Slingshot Band (Front)
      if (!isFlying.current) {
        ctx.save();
        const dynamicColor = ctx.createLinearGradient(ballPos.current.x, ballPos.current.y, anchorPos.current.x + 45, anchorPos.current.y - 15);
        dynamicColor.addColorStop(0, isPinching.current ? `hsl(${70 - stretchPct * 70}, 100%, 60%)` : '#a5b4fc');
        dynamicColor.addColorStop(1, '#6366f1');

        ctx.shadowBlur = 8;
        ctx.shadowColor = '#6366f1';
        ctx.beginPath();
        ctx.moveTo(ballPos.current.x, ballPos.current.y);
        ctx.lineTo(anchorPos.current.x + 45, anchorPos.current.y - 15);
        ctx.lineWidth = isPinching.current ? Math.max(3, 7 * (1 - stretchPct * 0.4)) : 7;
        ctx.strokeStyle = dynamicColor;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      }

      // Draw Slingshot Fork Handle (Futuristic Golden Metal Prong Y-Fork)
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(99, 102, 241, 0.35)';
      
      // Fork Handle Shaft
      ctx.beginPath();
      ctx.moveTo(anchorPos.current.x, canvas.height); 
      ctx.lineTo(anchorPos.current.x, anchorPos.current.y + 45);
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#27272a'; 
      ctx.lineCap = 'square';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(anchorPos.current.x, canvas.height); 
      ctx.lineTo(anchorPos.current.x, anchorPos.current.y + 45);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#6366f1'; 
      ctx.stroke();

      // Golden Metallic Prongs Y-fork arms
      ctx.beginPath();
      ctx.moveTo(anchorPos.current.x, anchorPos.current.y + 45);
      ctx.quadraticCurveTo(anchorPos.current.x - 30, anchorPos.current.y + 35, anchorPos.current.x - 45, anchorPos.current.y - 15);
      ctx.moveTo(anchorPos.current.x, anchorPos.current.y + 45);
      ctx.quadraticCurveTo(anchorPos.current.x + 30, anchorPos.current.y + 35, anchorPos.current.x + 45, anchorPos.current.y - 15);
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#d97706'; 
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(anchorPos.current.x, anchorPos.current.y + 45);
      ctx.quadraticCurveTo(anchorPos.current.x - 30, anchorPos.current.y + 35, anchorPos.current.x - 45, anchorPos.current.y - 15);
      ctx.moveTo(anchorPos.current.x, anchorPos.current.y + 45);
      ctx.quadraticCurveTo(anchorPos.current.x + 30, anchorPos.current.y + 35, anchorPos.current.x + 45, anchorPos.current.y - 15);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#f59e0b'; 
      ctx.stroke();

      // Glowing tips
      ctx.beginPath();
      ctx.arc(anchorPos.current.x - 45, anchorPos.current.y - 15, 9, 0, Math.PI * 2);
      ctx.arc(anchorPos.current.x + 45, anchorPos.current.y - 15, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#6366f1';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Draw Particles with smooth life decay
      for (let i = particles.current.length - 1; i >= 0; i--) {
          const p = particles.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.025; 
          if (p.life <= 0) {
            particles.current.splice(i, 1);
          } else {
              ctx.save();
              ctx.globalAlpha = p.life;
              ctx.shadowBlur = 8;
              ctx.shadowColor = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 4 + p.life * 4, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.fill();
              ctx.restore();
          }
      }
      
      ctx.restore();

      // Send to AI
      if (captureRequestRef.current) {
        captureRequestRef.current = false;
        
        if (controlModeRef.current === 'ai') {
          const offscreen = document.createElement('canvas');
          const targetWidth = 480; 
          const scale = Math.min(1, targetWidth / canvas.width);
          
          offscreen.width = canvas.width * scale;
          offscreen.height = canvas.height * scale;
          
          const oCtx = offscreen.getContext('2d');
          if (oCtx) {
              oCtx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
              const screenshot = offscreen.toDataURL("image/jpeg", 0.6);
              setTimeout(() => performAiAnalysis(screenshot), 0);
          }
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    if (window.Hands) {
      hands = new window.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      hands.onResults((results: any) => {
        latestImage.current = results.image;
        latestHandLandmarks.current = results.multiHandLandmarks && results.multiHandLandmarks.length > 0 ? results.multiHandLandmarks[0] : null;
        setLoading(false);
      });

      if (window.Camera) {
        camera = new window.Camera(video, {
          onFrame: async () => {
            if (videoRef.current && hands) await hands.send({ image: videoRef.current });
          },
          width: 1280,
          height: 720,
        });
        camera.start();
      }
    }

    return () => {
        cancelAnimationFrame(animationFrameId);
        if (camera) camera.stop();
        if (hands) hands.close();
    };
  }, [isPlaying, initGrid]);

  const recColorConfig = aiRecommendedColor ? COLOR_CONFIG[aiRecommendedColor] : null;
  const borderColor = recColorConfig ? recColorConfig.hex : '#3f3f46';

  return (
    <div className="flex w-full h-screen bg-[#08090c] overflow-hidden text-[#f4f4f5]">
      
      {/* MOBILE/TABLET BLOCKER OVERLAY */}
      <div className="fixed inset-0 z-[100] bg-[#08090c] flex flex-col items-center justify-center p-8 text-center md:hidden">
         <Monitor className="w-16 h-16 text-[#ef5350] mb-6 animate-pulse" />
         <h2 className="text-2xl font-bold text-[#f4f4f5] mb-4">{t.desktopRequired}</h2>
         <p className="text-[#a1a1aa] max-w-md text-lg leading-relaxed">
           {t.desktopRequiredDesc}
         </p>
         <div className="mt-8 flex items-center gap-2 text-sm text-[#52525b] uppercase tracking-wider font-bold">
           <div className="w-2 h-2 bg-[#00d2ff] rounded-full"></div>
           {t.maximizeWindow}
         </div>
      </div>

      {/* PRE-GAME STARTING WELCOME SCREEN (HAPPY GAMES) */}
      {!isPlaying && (
        <div className="fixed inset-0 z-50 bg-[#06070a] bg-cyber-grid flex items-center justify-center p-6 overflow-y-auto">
          {/* Radial mask fade for high-tech grid effect */}
          <div className="absolute inset-0 bg-radial-fade pointer-events-none" />

          {/* Floating Glowing Background Orbs */}
          <div className="absolute top-[10%] left-[5%] w-[380px] h-[380px] bg-[#6366f1]/15 rounded-full filter blur-[100px] bg-orb-1 pointer-events-none" />
          <div className="absolute bottom-[10%] right-[5%] w-[420px] h-[420px] bg-[#d500f9]/12 rounded-full filter blur-[120px] bg-orb-2 pointer-events-none" />
          <div className="absolute top-[35%] right-[20%] w-[280px] h-[280px] bg-[#00d2ff]/8 rounded-full filter blur-[90px] bg-orb-1 pointer-events-none" />
          
          <div className="bg-[#0e1017]/90 backdrop-blur-3xl border border-white/[0.08] rounded-[48px] max-w-4xl w-full p-8 md:p-14 text-center shadow-[0_35px_90px_-15px_rgba(0,0,0,0.95)] hover:shadow-[0_0_60px_rgba(99,102,241,0.12)] transition-shadow duration-700 relative overflow-hidden animate-card-intro">
            
            {/* Header Language Toggle Capsule */}
            <div className="absolute top-8 right-8 z-10 flex items-center bg-black/55 p-1 rounded-full border border-white/[0.07] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] font-tech">
              <button 
                onClick={() => setLang('zh')}
                className={`text-[10px] uppercase tracking-wider font-extrabold px-3.5 py-1.5 rounded-full transition-all duration-300 ${lang === 'zh' ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                中
              </button>
              <button 
                onClick={() => setLang('en')}
                className={`text-[10px] uppercase tracking-wider font-extrabold px-3.5 py-1.5 rounded-full transition-all duration-300 ${lang === 'en' ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                EN
              </button>
            </div>

            {/* Sparkles Game Logo Badge with RGB Flow Border */}
            <div className="inline-flex items-center gap-2.5 badge-rgb-flow px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest mb-10 shadow-lg font-tech">
              <Sparkles className="w-3.5 h-3.5 text-rgb-flow" />
              <span className="text-rgb-flow font-black tracking-widest text-[10px]">HAPPY GAMES PRESENTED</span>
            </div>

            {/* Main Title & Subtitle */}
            <h1 className="text-4xl md:text-5.5xl font-black tracking-[0.04em] text-white mb-5 title-glow font-title">
              {lang === 'zh' ? (
                <>双指弹弓：<span className="bg-gradient-to-r from-[#a5b4fc] via-[#e879f9] to-[#d500f9] bg-clip-text text-transparent">AI 战术大师</span></>
              ) : (
                <>slingshot-tactician: <span className="bg-gradient-to-r from-[#a5b4fc] via-[#e879f9] to-[#d500f9] bg-clip-text text-transparent">AI Master</span></>
              )}
            </h1>
            <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto mb-12 opacity-85 tracking-wide">
              {t.subtitle}
            </p>

            {/* Control Instructions Grid (Beautified with cyber brackets & glowing accent borders) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
              {/* Card 1 */}
              <div 
                className="bg-gradient-to-b from-white/[0.04] to-transparent hover:bg-white/[0.08] backdrop-blur-md p-7 rounded-[28px] border border-white/[0.05] hover:border-white/[0.14] transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center shadow-lg hover:shadow-[0_15px_35px_rgba(99,102,241,0.22)] relative group"
              >
                {/* Corner Brackets */}
                <div className="absolute top-3.5 left-3.5 w-3 h-3 border-t-2 border-l-2 border-white/20 group-hover:border-[#6366f1]/85 transition duration-300 rounded-tl-[4px]" />
                <div className="absolute top-3.5 right-3.5 w-3 h-3 border-t-2 border-r-2 border-white/20 group-hover:border-[#6366f1]/85 transition duration-300 rounded-tr-[4px]" />
                <div className="absolute bottom-3.5 left-3.5 w-3 h-3 border-b-2 border-l-2 border-white/20 group-hover:border-[#6366f1]/85 transition duration-300 rounded-bl-[4px]" />
                <div className="absolute bottom-3.5 right-3.5 w-3 h-3 border-b-2 border-r-2 border-white/20 group-hover:border-[#6366f1]/85 transition duration-300 rounded-br-[4px]" />

                {/* Top colored accent glow line */}
                <div className="absolute top-0 inset-x-10 h-[2px] bg-gradient-to-r from-transparent via-[#6366f1] to-transparent opacity-40 group-hover:opacity-100 transition duration-300" />

                {/* Step Number Badge */}
                <div className="absolute top-4 left-5 text-[10px] font-bold tracking-[0.2em] text-[#6366f1] opacity-80 group-hover:opacity-100 transition duration-300 font-tech">
                  STAGE 01
                </div>

                {/* Glowing Icon Container */}
                <div className="relative w-16 h-16 rounded-full bg-[#6366f1]/10 flex items-center justify-center mb-5 text-[#818cf8] border border-[#6366f1]/25 group-hover:scale-110 group-hover:bg-[#6366f1]/20 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                  <Hand className="w-6 h-6" />
                </div>

                <h4 className="text-white text-[15px] font-bold mb-2.5 tracking-[0.08em] uppercase font-hud">{t.howToPlayPinchTitle}</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-medium tracking-wide">{t.howToPlayPinchDesc}</p>
              </div>

              {/* Card 2 */}
              <div 
                className="bg-gradient-to-b from-white/[0.04] to-transparent hover:bg-white/[0.08] backdrop-blur-md p-7 rounded-[28px] border border-white/[0.05] hover:border-white/[0.14] transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center shadow-lg hover:shadow-[0_15px_35px_rgba(16,185,129,0.22)] relative group"
              >
                {/* Corner Brackets */}
                <div className="absolute top-3.5 left-3.5 w-3 h-3 border-t-2 border-l-2 border-white/20 group-hover:border-[#10b981]/85 transition duration-300 rounded-tl-[4px]" />
                <div className="absolute top-3.5 right-3.5 w-3 h-3 border-t-2 border-r-2 border-white/20 group-hover:border-[#10b981]/85 transition duration-300 rounded-tr-[4px]" />
                <div className="absolute bottom-3.5 left-3.5 w-3 h-3 border-b-2 border-l-2 border-white/20 group-hover:border-[#10b981]/85 transition duration-300 rounded-bl-[4px]" />
                <div className="absolute bottom-3.5 right-3.5 w-3 h-3 border-b-2 border-r-2 border-white/20 group-hover:border-[#10b981]/85 transition duration-300 rounded-br-[4px]" />

                {/* Top colored accent glow line */}
                <div className="absolute top-0 inset-x-10 h-[2px] bg-gradient-to-r from-transparent via-[#10b981] to-transparent opacity-40 group-hover:opacity-100 transition duration-300" />

                {/* Step Number Badge */}
                <div className="absolute top-4 left-5 text-[10px] font-bold tracking-[0.2em] text-[#10b981] opacity-80 group-hover:opacity-100 transition duration-300 font-tech">
                  STAGE 02
                </div>

                {/* Glowing Icon Container */}
                <div className="relative w-16 h-16 rounded-full bg-[#10b981]/10 flex items-center justify-center mb-5 text-[#34d399] border border-[#10b981]/25 group-hover:scale-110 group-hover:bg-[#10b981]/20 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  <Palette className="w-6 h-6" />
                </div>

                <h4 className="text-white text-[15px] font-bold mb-2.5 tracking-[0.08em] uppercase font-hud">{t.howToPlayColorTitle}</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-medium tracking-wide">{t.howToPlayColorDesc}</p>
              </div>

              {/* Card 3 */}
              <div 
                className="bg-gradient-to-b from-white/[0.04] to-transparent hover:bg-white/[0.08] backdrop-blur-md p-7 rounded-[28px] border border-white/[0.05] hover:border-white/[0.14] transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center shadow-lg hover:shadow-[0_15px_35px_rgba(168,85,247,0.22)] relative group"
              >
                {/* Corner Brackets */}
                <div className="absolute top-3.5 left-3.5 w-3 h-3 border-t-2 border-l-2 border-white/20 group-hover:border-[#a855f7]/85 transition duration-300 rounded-tl-[4px]" />
                <div className="absolute top-3.5 right-3.5 w-3 h-3 border-t-2 border-r-2 border-white/20 group-hover:border-[#a855f7]/85 transition duration-300 rounded-tr-[4px]" />
                <div className="absolute bottom-3.5 left-3.5 w-3 h-3 border-b-2 border-l-2 border-white/20 group-hover:border-[#a855f7]/85 transition duration-300 rounded-bl-[4px]" />
                <div className="absolute bottom-3.5 right-3.5 w-3 h-3 border-b-2 border-r-2 border-white/20 group-hover:border-[#a855f7]/85 transition duration-300 rounded-br-[4px]" />

                {/* Top colored accent glow line */}
                <div className="absolute top-0 inset-x-10 h-[2px] bg-gradient-to-r from-transparent via-[#a855f7] to-transparent opacity-40 group-hover:opacity-100 transition duration-300" />

                {/* Step Number Badge */}
                <div className="absolute top-4 left-5 text-[10px] font-bold tracking-[0.2em] text-[#a855f7] opacity-80 group-hover:opacity-100 transition duration-300 font-tech">
                  STAGE 03
                </div>

                {/* Glowing Icon Container */}
                <div className="relative w-16 h-16 rounded-full bg-[#a855f7]/10 flex items-center justify-center mb-5 text-[#c084fc] border border-[#a855f7]/25 group-hover:scale-110 group-hover:bg-[#a855f7]/20 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                  <Zap className="w-6 h-6" />
                </div>

                <h4 className="text-white text-[15px] font-bold mb-2.5 tracking-[0.08em] uppercase font-hud">{t.howToPlayAiTitle}</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-medium tracking-wide">{t.howToPlayAiDesc}</p>
              </div>
            </div>

            {/* Prerequisites Tip */}
            <p className="text-[11px] text-slate-500 font-medium leading-normal max-w-xl mx-auto mb-10 border border-white/[0.03] bg-white/[0.01] px-6 py-2.5 rounded-full tracking-wide font-hud">
              {t.prerequisite}
            </p>

            {/* API Key Configuration Card */}
            <div className="max-w-md mx-auto mb-10 p-6 rounded-[28px] bg-white/[0.02] border border-white/[0.06] backdrop-blur-md text-left relative overflow-hidden group">
              <div className="absolute top-0 inset-x-10 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
              <h3 className="text-xs font-black text-slate-300 mb-2 uppercase tracking-widest font-tech flex items-center gap-2">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                <span>{lang === 'zh' ? 'Gemini 智能大脑配置' : 'Gemini AI Configuration'}</span>
              </h3>
              <p className="text-[11px] text-slate-400 mb-4 leading-relaxed font-medium tracking-wide">
                {lang === 'zh' 
                  ? '如需开启 AI 战术助手，请在此配置你的 Gemini API Key；若留空则自动以 [人工模式] 启动游戏，支持离线且不消耗任何 API 额度。' 
                  : 'To activate the AI strategist, input your Gemini API Key here. Leave blank to start in [Manual Mode] (no key or network required).'}
              </p>
              <div className="relative">
                <input 
                  type="password"
                  placeholder="AI Studio API Key (AIzaSy...)"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    localStorage.setItem('gemini_api_key', e.target.value);
                    initGeminiClient(e.target.value);
                  }}
                  className="w-full bg-black/60 border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono-tech shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
                />
              </div>
            </div>

            {/* BIG PLAY BUTTON (With Shine effect & subtitle) */}
            <div className="relative inline-block mb-10 group/btn">
              {/* Outer pulsing shadow ring */}
              <div className="absolute inset-0 bg-[#6366f1]/25 rounded-full filter blur-[15px] animate-pulse pointer-events-none scale-105" />
              
              <button
                onClick={() => {
                  if (!apiKey.trim()) {
                    setControlMode('manual');
                    controlModeRef.current = 'manual';
                  }
                  setIsPlaying(true);
                }}
                className="btn-shine cyber-btn relative inline-flex flex-col items-center justify-center text-white px-16 py-5.5 rounded-full transition-all duration-300 transform active:scale-95 min-w-[290px]"
              >
                <div className="flex items-center justify-center font-bold tracking-[0.1em] text-xl font-hud">
                  <Play className="w-5 h-5 mr-3 fill-current animate-pulse" />
                  <span>{t.playGame}</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#a5b4fc] font-bold mt-1.5 opacity-80 group-hover:opacity-100 transition duration-300 font-tech">
                  LAUNCH SYSTEM ENGINE
                </span>
              </button>
            </div>

            {/* Terms and conditions link */}
            <div className="mb-4 text-center text-[10px] text-gray-500 font-hud">
              <button 
                onClick={() => setShowTerms(true)} 
                className="hover:text-[#818cf8] underline decoration-[#6366f1]/25 hover:decoration-[#818cf8]/50 transition duration-300 tracking-wider uppercase font-bold"
              >
                {lang === 'zh' ? '用户协议与隐私条款 / Terms & Privacy' : 'Terms & Privacy Policy'}
              </button>
            </div>

            {/* Credits Footer with RGB flow */}
            <div className="mt-4 pt-6 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-gray-500 font-mono-tech tracking-wider">
              <span>v1.0.0</span>
              <span className="font-bold hover:scale-105 transition duration-300 uppercase font-hud">
                {lang === 'zh' ? '创作者：' : 'Author: '}
                <span className="text-rgb-flow font-black text-sm tracking-[0.12em] font-tech">HAPPY GAMES</span>
              </span>
              <span>© 2026</span>
            </div>
          </div>
        </div>
      )}

      {/* LEFT: Game Area */}
      <div ref={gameContainerRef} className="flex-1 relative h-full overflow-hidden bg-black">
        <video ref={videoRef} className="absolute hidden" playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Loading Overlay */}
        {loading && isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#08090c] z-50">
            <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-[#6366f1] animate-spin mb-4" />
                <p className="text-[#f4f4f5] text-lg font-medium">{t.startingEngine}</p>
            </div>
            </div>
        )}

        {/* GAME OVER OVERLAY */}
        {gameOver && (
          <div className="absolute inset-0 z-50 bg-[#08090c]/90 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[#12131a]/85 border border-[#ef5350]/30 rounded-[32px] max-w-md w-full p-8 text-center shadow-2xl relative animate-scale-in">
              <div className="bg-[#ef5350]/15 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border border-[#ef5350]/30 shadow-[0_0_20px_rgba(239,83,80,0.2)]">
                <AlertTriangle className="w-8 h-8 text-[#ef5350]" />
              </div>
              <h2 className="text-3xl font-black tracking-[0.05em] text-[#ef5350] mb-2 font-title uppercase">{t.gameOver}</h2>
              <p className="text-slate-400 text-sm mb-6 font-medium tracking-wide">{t.gameOverSub}</p>
              
              <div className="bg-black/40 py-5 px-8 rounded-2xl border border-white/[0.05] mb-8 inline-block min-w-[220px]">
                <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] block mb-1.5 font-hud">{t.score}</span>
                <span className="text-4xl font-black text-white font-mono-tech tracking-wider text-glow-purple">{score.toLocaleString()}</span>
              </div>

              <button
                onClick={handleRestart}
                className="w-full py-4 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:from-[#4f46e5] hover:to-[#7c3aed] text-white font-bold rounded-2xl transition duration-300 shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2 font-hud tracking-[0.1em] text-sm uppercase"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t.restartBtn}</span>
              </button>
            </div>
          </div>
        )}

        {/* Analyzing Overlay - positioned at Slingshot Anchor */}
        {isAiThinking && !gameOver && (
          <div 
            className="absolute left-1/2 -translate-x-1/2 z-40 flex flex-col items-center justify-center pointer-events-none"
            style={{ bottom: '220px', transform: 'translate(-50%, 50%)' }}
          >
             <div className="w-[72px] h-[72px] rounded-full border-4 border-t-[#818cf8] border-r-[#818cf8] border-b-transparent border-l-transparent animate-spin shadow-[0_0_20px_rgba(129,140,248,0.2)]" />
             <p className="mt-4 text-[#818cf8] font-bold text-xs tracking-[0.2em] animate-pulse font-hud">{t.analyzing}</p>
          </div>
        )}

        {/* HUD: Score Card */}
        <div className="absolute top-6 left-6 z-40 flex flex-col gap-3.5">
            <div className="bg-[#12131a]/85 px-8 py-5 rounded-[28px] border border-white/[0.08] backdrop-blur-xl shadow-2xl flex items-center gap-5 min-w-[220px]">
                <div className="bg-[#00d2ff]/10 p-3.5 rounded-2xl border border-[#00d2ff]/20 shadow-[0_0_15px_rgba(0,210,255,0.15)]">
                    <Trophy className="w-7 h-7 text-[#00d2ff]" />
                </div>
                <div>
                    <p className="text-[12px] text-slate-400 uppercase tracking-[0.18em] font-bold font-hud">{t.score}</p>
                    <p className="text-4.5xl font-black text-white leading-none mt-2 font-mono-tech tracking-wider text-glow-cyan">{score.toLocaleString()}</p>
                </div>
            </div>
            {highScore > 0 && (
              <div className="bg-[#12131a]/60 px-6 py-3 rounded-[20px] border border-white/[0.05] backdrop-blur-lg shadow-xl flex items-center gap-3.5 self-start">
                <span className="text-[10.5px] text-[#fbbf24]/90 uppercase tracking-[0.15em] font-bold font-hud">{t.highScore}</span>
                <span className="text-base font-bold text-white leading-none font-mono-tech tracking-wider text-glow-purple">{highScore.toLocaleString()}</span>
              </div>
            )}
        </div>

        {/* HUD: Quick Restart & Language controls */}
        <div className="absolute top-6 right-6 z-40 flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="w-12 h-12 rounded-2xl bg-[#12131a]/85 border border-white/[0.07] backdrop-blur-xl hover:bg-white/5 active:scale-95 flex items-center justify-center transition shadow-2xl"
            title="Switch Language"
          >
            <Languages className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={handleRestart}
            className="w-12 h-12 rounded-2xl bg-[#12131a]/85 border border-white/[0.07] backdrop-blur-xl hover:bg-white/5 active:scale-95 flex items-center justify-center transition shadow-2xl"
            title={t.restart}
          >
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* HUD: Color Picker */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
            <div className="bg-[#12131a]/85 px-6 py-4 rounded-[32px] border border-white/[0.08] backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex items-center gap-4">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.15em] mr-2 hidden md:block font-hud">{t.selectColor}</p>
                
                <div className="flex items-center gap-3.5">
                {availableColors.length === 0 ? (
                    <p className="text-xs text-gray-500">{t.noAmmo}</p>
                ) : (
                    COLOR_KEYS.filter(c => availableColors.includes(c)).map(color => {
                        const isSelected = selectedColor === color;
                        const isRecommended = aiRecommendedColor === color;
                        const config = COLOR_CONFIG[color];
                        
                        return (
                            <button
                                key={color}
                                onClick={() => setSelectedColor(color)}
                                className={`relative w-14 h-14 rounded-full transition-all duration-300 transform flex items-center justify-center
                                    ${isSelected ? 'scale-110 ring-4 ring-white/40 z-10' : 'opacity-70 hover:opacity-100 hover:scale-105'}
                                `}
                                style={{ 
                                    background: `radial-gradient(circle at 35% 35%, ${config.hex}, ${adjustColor(config.hex, -70)})`,
                                    boxShadow: isSelected 
                                        ? `0 0 25px ${config.hex}, inset 0 -4px 4px rgba(0,0,0,0.4)`
                                        : '0 4px 8px rgba(0,0,0,0.4), inset 0 -4px 4px rgba(0,0,0,0.4)'
                                }}
                            >
                                <div className="absolute top-2 left-3 w-4 h-2 bg-white/40 rounded-full transform -rotate-45 filter blur-[1px]" />
                                
                                {isRecommended && !isSelected && (
                                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#6366f1] border border-white/20 text-white text-[10px] font-black flex items-center justify-center rounded-full animate-bounce shadow-md">!</span>
                                )}
                                {isSelected && (
                                    <MousePointerClick className="w-5 h-5 text-white/95 drop-shadow-md" />
                                )}
                            </button>
                        )
                    })
                )}
                </div>

                {/* Divider */}
                <div className="w-[1px] h-8 bg-white/10 mx-1 hidden sm:block" />

                {/* Control Mode Switcher */}
                <div className="flex bg-black/45 p-1 rounded-2xl border border-white/[0.05] shrink-0">
                    <button
                        onClick={() => setControlMode('ai')}
                        className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-300 text-[10.5px] font-bold uppercase tracking-wider font-hud ${
                            controlMode === 'ai'
                                ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                        }`}
                        title={t.aiModeTitle}
                    >
                        <BrainCircuit className="w-3.5 h-3.5" />
                        <span>{t.aiMode}</span>
                    </button>
                    <button
                        onClick={() => setControlMode('manual')}
                        className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-300 text-[10.5px] font-bold uppercase tracking-wider font-hud ${
                            controlMode === 'manual'
                                ? 'bg-gradient-to-r from-[#10b981] to-[#059669] text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                        }`}
                        title={t.manualModeTitle}
                    >
                        <MousePointerClick className="w-3.5 h-3.5" />
                        <span>{t.manualMode}</span>
                    </button>
                </div>
            </div>
        </div>

        {/* Bottom Tip */}
        {!isPinching.current && !isFlying.current && !isAiThinking && isPlaying && !gameOver && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none opacity-60">
                <div className="flex items-center gap-2 bg-[#12131a]/95 px-5 py-2.5 rounded-full border border-white/[0.06] backdrop-blur-xl shadow-2xl">
                    <Play className="w-3 h-3 text-[#6366f1] fill-current animate-pulse" />
                    <p className="text-white/90 text-xs font-semibold tracking-[0.08em] font-hud">{t.pinchToShoot}</p>
                </div>
            </div>
        )}
      </div>

      {/* RIGHT: Tactical Sidebar Panel (Obsidian glassmorphism) */}
      <div className="w-[410px] bg-[#0c0d12]/95 border-l border-white/[0.07] backdrop-blur-xl flex flex-col h-full overflow-hidden shadow-2xl">
        
        {/* FLASH STRATEGY SECTION - PROMINENT */}
        <div 
            className="p-7 border-b-4 transition-all duration-500 flex flex-col gap-4 relative overflow-hidden"
            style={{ 
                backgroundColor: 'rgba(20, 22, 31, 0.95)',
                borderColor: borderColor
            }}
        >
             {/* Glowing ambient background inside tactic block */}
             <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none filter blur-[35px] opacity-20"
                  style={{ backgroundColor: borderColor }} />

             <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2.5 uppercase tracking-[0.15em] font-hud">
                    <BrainCircuit className="w-5.5 h-5.5" style={{ color: borderColor }} />
                    <h2 className="font-bold text-[13px]" style={{ color: borderColor }}>
                        {t.flashStrategy}
                    </h2>
                </div>
                {isAiThinking && <Loader2 className="w-4.5 h-4.5 animate-spin text-white/50" />}
             </div>
             
             {controlMode === 'ai' && !apiKey.trim() ? (
                 <div className="mt-2 bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl flex flex-col gap-3 text-left z-10 w-full">
                     <div className="flex items-start gap-2.5 text-indigo-400">
                         <BrainCircuit className="w-5 h-5 shrink-0 mt-0.5" />
                         <div>
                             <p className="text-[12px] font-bold uppercase tracking-[0.15em] font-hud">
                               {lang === 'zh' ? '配置 API Key 启用 AI' : 'Configure API Key for AI'}
                             </p>
                             <p className="text-[11.5px] text-slate-400 mt-1.5 leading-relaxed font-medium">
                               {lang === 'zh' 
                                 ? '检测到未配置 API Key。请输入你的 Gemini 密钥以激活 AI 战术分析：'
                                 : 'No API key configured. Enter your Gemini API key below to activate AI features:'}
                             </p>
                         </div>
                     </div>
                     <input 
                       type="password"
                       placeholder="AI Studio API Key (AIzaSy...)"
                       value={apiKey}
                       onChange={(e) => {
                         setApiKey(e.target.value);
                         localStorage.setItem('gemini_api_key', e.target.value);
                         initGeminiClient(e.target.value);
                       }}
                       className="w-full bg-black/60 border border-white/[0.08] rounded-xl px-4 py-2 text-xs text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono-tech"
                     />
                 </div>
             ) : (
               <>
                 <p className="text-[#f4f4f5] text-[17px] leading-relaxed font-extrabold z-10 tracking-wide font-hud">
                    {aiHint}
                 </p>
                 
                 {aiRationale && (
                     <div className="flex gap-2.5 mt-1.5 z-10 bg-white/[0.02] p-4 rounded-xl border border-white/[0.03]">
                         <Lightbulb className="w-4.5 h-4.5 text-[#818cf8] shrink-0 mt-0.5" />
                         <p className="text-slate-300 text-[13.5px] leading-relaxed font-medium tracking-wide">
                            {aiRationale}
                         </p>
                     </div>
                 )}
               </>
             )}

             {debugInfo?.error && (
               (debugInfo.error.toLowerCase().includes('429') || 
                debugInfo.error.toLowerCase().includes('quota') || 
                debugInfo.error.toLowerCase().includes('exhausted')) && (
                 <div className="mt-3 bg-[#ef5350]/15 border border-[#ef5350]/20 p-4 rounded-2xl flex flex-col gap-3 text-left z-10">
                     <div className="flex items-start gap-2.5 text-[#ef5350]">
                         <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
                         <div>
                             <p className="text-[12px] font-bold uppercase tracking-[0.15em] font-hud">API 额度超限 / API Quota Exhausted</p>
                             <p className="text-[11.5px] text-slate-300 mt-1.5 leading-relaxed font-medium">
                                 {lang === 'zh' 
                                   ? '由于请求过于频繁，您的免费 API 额度已暂时耗尽。建议您一键切换至人工选择模式，在此模式下无需调用 AI API，不消耗任何额度且支持离线游玩。'
                                   : 'Your free Gemini API quota is temporarily exhausted. We suggest switching to Manual Mode, which requires no API calls and works 100% offline.'}
                             </p>
                         </div>
                     </div>
                     <button
                       onClick={() => setControlMode('manual')}
                       className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs uppercase tracking-widest shadow-lg transition active:scale-95 flex items-center justify-center gap-2 font-hud"
                     >
                       <Monitor className="w-4 h-4" />
                       <span>{lang === 'zh' ? '一键切换至人工模式' : 'Switch to Manual Mode'}</span>
                     </button>
                 </div>
               )
             )}
             
             {aiRecommendedColor && (
                <div className="flex items-center gap-2.5 mt-2 bg-black/35 px-3.5 py-2.5 rounded-xl border border-white/[0.04] z-10 self-start">
                    <Target className="w-4.5 h-4.5 text-gray-500" />
                    <span className="text-[11.5px] text-gray-500 uppercase tracking-[0.15em] font-bold font-hud">{t.recColor}:</span>
                    <span className="text-sm font-black uppercase tracking-[0.08em] font-tech" style={{ color: COLOR_CONFIG[aiRecommendedColor].hex }}>
                        {lang === 'zh' ? {
                          red: "红色", blue: "蓝色", green: "绿色", yellow: "黄色", purple: "紫色", orange: "橙色"
                        }[aiRecommendedColor] : COLOR_CONFIG[aiRecommendedColor].label}
                    </span>
                </div>
             )}
        </div>

        {/* DEBUG HEADER */}
        <div className="px-6 py-4.5 border-b border-white/[0.07] bg-black/45 flex items-center gap-2.5 text-gray-500 font-hud">
            <Terminal className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{t.debugger}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Status Section */}
            <div>
                <div className="flex items-center gap-2.5 mb-3 text-gray-400 text-[11px] font-bold uppercase tracking-[0.15em] font-hud">
                    <BrainCircuit className="w-3.5 h-3.5 text-[#6366f1]" /> {t.status}
                </div>
                <div className={`p-4 rounded-2xl border ${isAiThinking ? 'bg-[#6366f1]/10 border-[#6366f1]/30 text-[#a5b4fc]' : 'bg-white/[0.02] border-white/[0.05] text-gray-400'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isAiThinking ? 'bg-[#a855f7] animate-pulse shadow-[0_0_10px_#a855f7]' : 'bg-[#10b981] shadow-[0_0_10px_#10b981]'}`} />
                        <span className="text-sm font-mono-tech font-bold tracking-wide">{isAiThinking ? t.processingVision : t.waitingInput}</span>
                    </div>
                </div>
            </div>

            {/* Vision Input */}
            {debugInfo?.screenshotBase64 && (
                <div>
                    <div className="flex items-center gap-2.5 mb-3 text-gray-400 text-[11px] font-bold uppercase tracking-[0.15em] font-hud">
                        <Eye className="w-3.5 h-3.5 text-[#00d2ff]" /> {t.visionInput}
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black/60 relative group shadow-lg">
                        <img src={debugInfo.screenshotBase64} alt="AI Vision" className="w-full h-auto opacity-75 group-hover:opacity-100 transition duration-300" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-2 text-[10px] text-center text-gray-500 font-mono-tech tracking-wider">
                            {t.sentToGemini}
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt Context */}
            {debugInfo?.promptContext && (
                <div>
                    <div className="flex items-center gap-2.5 mb-3 text-gray-400 text-[11px] font-bold uppercase tracking-[0.15em] font-hud">
                        <Terminal className="w-3.5 h-3.5 text-yellow-500" /> {t.promptContext}
                    </div>
                    <div className="bg-black/45 p-4.5 rounded-2xl border border-white/[0.05] font-mono-tech text-[11px] text-slate-400 h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed tracking-wide">
                        {debugInfo.promptContext}
                    </div>
                </div>
            )}

            {/* AI Output Stats */}
            {debugInfo && (
                <div className="space-y-5">
                    <div className="flex items-center gap-2.5 mb-3 text-gray-400 text-[11px] font-bold uppercase tracking-[0.15em] font-hud">
                        <BrainCircuit className="w-3.5 h-3.5 text-emerald-500" /> {t.poweredBy}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3.5">
                         <div className="bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.05]">
                            <p className="text-[10.5px] text-gray-500 mb-1.5 uppercase font-hud tracking-[0.1em] font-bold">{t.latency}</p>
                            <div className="flex items-center gap-1 text-[#6366f1] font-mono-tech font-bold text-base tracking-wide text-glow-purple">
                                {debugInfo.latency}ms
                            </div>
                         </div>
                         <div className="bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.05]">
                            <p className="text-[10.5px] text-gray-500 mb-1.5 uppercase font-hud tracking-[0.1em] font-bold">{t.recColor}</p>
                            <div className="flex items-center gap-1 text-white font-mono-tech font-bold text-base tracking-wide capitalize">
                                {debugInfo.parsedResponse?.recommendedColor || '--'}
                            </div>
                         </div>
                    </div>

                    {debugInfo.error && (
                         <div className="bg-[#ef5350]/10 border border-[#ef5350]/20 p-4 rounded-xl text-left">
                            <div className="flex items-start gap-3 text-[#ef5350]">
                                <AlertTriangle className="w-4.5 h-4.5 mt-0.5 shrink-0 animate-bounce" />
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] font-hud">ERROR DETAILS</p>
                                    <p className="text-xs font-mono-tech mt-1.5 break-all text-red-400/90 leading-relaxed tracking-wide">{debugInfo.error}</p>
                                    
                                    {(debugInfo.error.toLowerCase().includes('429') || 
                                      debugInfo.error.toLowerCase().includes('quota') || 
                                      debugInfo.error.toLowerCase().includes('exhausted')) && (
                                         <button
                                           onClick={() => setControlMode('manual')}
                                           className="mt-3.5 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-[10.5px] uppercase tracking-wider shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5 font-hud"
                                         >
                                           <Monitor className="w-3.5 h-3.5" />
                                           <span>{lang === 'zh' ? '一键切换至人工模式继续' : 'Switch to Manual Mode'}</span>
                                         </button>
                                    )}
                                </div>
                            </div>
                         </div>
                    )}

                    <div>
                      <p className="text-[11px] text-gray-500 mb-2 font-bold uppercase tracking-[0.15em] font-hud">{t.rawResponse}</p>
                      <div className="bg-black/45 p-4.5 rounded-2xl border border-white/[0.05] font-mono-tech text-[11px] text-[#00e676]/90 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed tracking-wide border-l-2 border-l-[#00e676]/65">
                          {debugInfo.rawResponse}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] text-gray-500 mb-2 font-bold uppercase tracking-[0.15em] font-hud">{t.parsedJson}</p>
                      <div className="bg-black/45 p-4.5 rounded-2xl border border-white/[0.05] font-mono-tech text-[11px] text-[#00d2ff] overflow-x-auto whitespace-pre leading-normal tracking-wide">
                          <pre>{JSON.stringify(debugInfo.parsedResponse || { error: "Failed to parse" }, null, 2)}</pre>
                      </div>
                    </div>
                </div>
            )}
        </div>
        
        <div className="p-4 bg-black/40 border-t border-white/[0.06] text-center backdrop-blur-sm z-10 font-hud">
            <p className="text-[10.5px] text-gray-500 font-bold uppercase tracking-widest">{t.poweredBy}</p>
        </div>
      </div>

      {/* TERMS & PRIVACY DIALOG OVERLAY */}
      {showTerms && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1017]/95 border border-white/[0.1] rounded-[36px] max-w-2xl w-full p-6 md:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.85)] max-h-[85vh] flex flex-col relative animate-card-intro font-hud text-[#f4f4f5]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-indigo-400" />
                <h3 className="text-lg font-bold uppercase tracking-wider text-glow-purple">
                  {lang === 'zh' ? '用户协议与隐私条款' : 'Terms & Privacy Policy'}
                </h3>
              </div>
              <button 
                onClick={() => setShowTerms(false)}
                className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.07] hover:bg-white/10 active:scale-95 flex items-center justify-center transition"
              >
                <span className="text-lg text-gray-400 hover:text-white">✕</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-xs md:text-sm text-slate-300 leading-relaxed max-h-[50vh] pr-4">
              
              {/* Section 1 */}
              <div>
                <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded-full inline-block"></span>
                  {lang === 'zh' ? '1. 摄像头与手势隐私声明' : '1. Webcam & Gesture Privacy'}
                </h4>
                <p className="pl-3.5 text-slate-400">
                  {lang === 'zh' 
                    ? '本游戏使用 MediaPipe 库通过您的摄像头识别手势（如捏合和拉拽）来操作弹弓。所有摄像头画面仅在您的浏览器本地进行实时分析，游戏不会上传、记录或向任何服务器（包括 HAPPY Games）发送任何您的摄像头视频流或个人人脸特征。'
                    : 'This game uses Google MediaPipe WebAssembly to analyze your webcam feed for hand gestures (like pinch & drag) locally in your browser. Your webcam feed is processed in-memory and is never recorded, stored, or uploaded to any server.'}
                </p>
              </div>

              {/* Section 2 */}
              <div>
                <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-[#e879f9] rounded-full inline-block"></span>
                  {lang === 'zh' ? '2. AI 战术分析与数据收集' : '2. AI Analysis & Data Policy'}
                </h4>
                <p className="pl-3.5 text-slate-400">
                  {lang === 'zh' 
                    ? '当您处于“AI战术”推荐模式时，游戏会将游戏画板（Canvas）的二维图形截图和泡泡布局数据发送至 Google Gemini 2.5 Flash 接口，以生成瞄准和颜色搭配推荐。发送的数据仅包含游戏的黑底二维彩球坐标与状态，绝对不包含您的面部图像或摄像头捕捉到的任何真实画面。如果您切换到“人工选择”模式，游戏将完全停止向 AI 接口发起任何请求。'
                    : 'In AI Recommendation Mode, the game captures a 2D screenshot of the game canvas (only containing the abstract color circles and slingshot graphics, never your webcam feed) and sends it to the Google Gemini 2.5 Flash API to retrieve strategic recommendations. If you toggle to "Manual Mode", no network requests are sent to the AI API.'}
                </p>
              </div>

              {/* Section 3 */}
              <div>
                <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-emerald-500 rounded-full inline-block"></span>
                  {lang === 'zh' ? '3. 免责声明与技术限制' : '3. Technical Limitations & Disclaimer'}
                </h4>
                <p className="pl-3.5 text-slate-400">
                  {lang === 'zh' 
                    ? 'AI 智能战术推荐仅作为娱乐辅助，不保证 100% 的连消准确率。手势控制的灵敏度与精度高度依赖于您的摄像头质量、环境光线以及浏览器的 CPU/WASM 运算能力。'
                    : 'AI tactical recommendations are for entertainment purposes only and do not guarantee combos. Gesture control sensitivity depends on your camera sensor quality, background lighting, and browser capabilities.'}
                </p>
              </div>

              {/* Section 4 */}
              <div>
                <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-[#fbbf24] rounded-full inline-block"></span>
                  {lang === 'zh' ? '4. 版权与开源致谢' : '4. Intellectual Property & License'}
                </h4>
                <p className="pl-3.5 text-slate-400">
                  {lang === 'zh' 
                    ? '本项目由 HAPPY Games 倾情呈现。游戏内所用到的 MediaPipe (Google)、Lucide Icons、Google Fonts 等第三方开源软件库，其版权归原作者所有。'
                    : 'Developed by HAPPY Games. Third-party open-source libraries: Google MediaPipe (Apache 2.0), Lucide-react (ISC), Google Fonts (OFL) are credited and owned by their respective authors.'}
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className="pt-5 border-t border-white/[0.08] mt-6 flex justify-end">
              <button 
                onClick={() => setShowTerms(false)}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:from-[#4f46e5] hover:to-[#7c3aed] text-white font-bold text-xs uppercase tracking-widest shadow-lg transition active:scale-95"
              >
                {lang === 'zh' ? '我已了解并同意' : 'Understand & Accept'}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* SECURITY VERIFICATION & TERMS GATEWAY OVERLAY */}
      {!isGateUnlocked && (
        <div className="fixed inset-0 z-[120] bg-[#06070a] bg-cyber-grid flex items-center justify-center p-4">
          <div className="bg-[#0e1017]/95 border border-white/[0.1] rounded-[36px] max-w-md w-full p-6 md:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.95)] relative animate-card-intro font-hud text-[#f4f4f5] text-center">
            
            {/* Lock/Security Icon Header */}
            <div className="bg-gradient-to-br from-[#6366f1]/15 to-[#8b5cf6]/15 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border border-white/[0.08] shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <HelpCircle className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>

            {gateStep === 'captcha' ? (
              <>
                <h3 className="text-xl font-bold tracking-wider mb-2 uppercase text-glow-purple font-title">
                  {lang === 'zh' ? '人机身份验证' : 'Security Verification'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  {lang === 'zh' 
                    ? '请拖动下方滑块拼接悬浮图片，以确认您不是机器人。'
                    : 'Please drag the slider to align the jigsaw puzzle, confirming you are human.'}
                </p>

                {/* Slider Captcha Canvas Container */}
                <div className="relative w-[280px] h-[155px] mx-auto rounded-2xl overflow-hidden border border-white/[0.1] shadow-2xl bg-black/40">
                  <canvas 
                    id="captchaBgCanvas" 
                    width="280" 
                    height="155" 
                    className="block"
                    style={{ transform: 'none' }}
                  />
                  <canvas 
                    id="captchaPieceCanvas" 
                    width="56" 
                    height="56" 
                    className="absolute pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                    style={{
                      left: `${sliderValue}px`,
                      top: `${captchaTargetY - 8}px`,
                      transform: 'none'
                    }}
                  />
                  
                  {/* Refresh button floating on Canvas */}
                  <button 
                    onClick={generateSliderCaptcha}
                    disabled={isCaptchaSuccess}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg bg-black/60 border border-white/[0.08] hover:bg-black/80 hover:border-white/20 active:scale-95 flex items-center justify-center transition disabled:opacity-50 disabled:scale-100"
                    title={lang === 'zh' ? '刷新验证码' : 'Refresh Captcha'}
                  >
                    <RefreshCw className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>
                </div>

                {/* Drag Slider Bar UI */}
                <div className="mt-6 relative w-[280px] mx-auto">
                  <div 
                    className={`relative h-10 rounded-xl border flex items-center justify-center overflow-hidden transition-all duration-300 ${
                      isCaptchaSuccess 
                        ? 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]' 
                        : captchaError 
                          ? 'bg-red-500/20 border-red-500/40 shadow-[0_0_15px_rgba(239,83,80,0.25)]'
                          : 'bg-black/60 border-white/[0.08]'
                    }`}
                  >
                    {/* Sliding progress bar fill */}
                    <div 
                      className={`absolute left-0 top-0 bottom-0 ${
                        isCaptchaSuccess 
                          ? 'bg-emerald-500/30' 
                          : captchaError 
                            ? 'bg-red-500/30' 
                            : 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20'
                      }`}
                      style={{ 
                        width: `${sliderValue + 20}px`,
                        transition: sliderValue === 0 ? 'width 0.3s ease-out' : 'none'
                      }}
                    />
                    
                    {/* Helper instruction text */}
                    <span 
                      className={`text-[10px] select-none font-bold uppercase tracking-wider transition-opacity duration-300 font-hud ${
                        isCaptchaSuccess 
                          ? 'text-emerald-400 font-bold' 
                          : captchaError 
                            ? 'text-red-400 font-bold' 
                            : 'text-slate-400 font-medium'
                      }`}
                      style={{ opacity: sliderValue > 120 && !isCaptchaSuccess ? 0.15 : 1 }}
                    >
                      {isCaptchaSuccess 
                        ? (lang === 'zh' ? '验证通过！' : 'VERIFIED!') 
                        : captchaError 
                          ? (lang === 'zh' ? '验证失败，请重试' : 'ALIGNMENT FAILED')
                          : (lang === 'zh' ? '向右拖动滑块拼接' : 'DRAG SLIDER TO ALIGN')}
                    </span>
                    
                    {/* Draggable slider thumb div */}
                    <div 
                      className={`absolute w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg ${
                        isCaptchaSuccess
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : captchaError
                            ? 'bg-red-500 border-red-400 text-white shadow-[0_0_10px_rgba(239,83,80,0.4)]'
                            : 'bg-gradient-to-br from-indigo-500 to-purple-600 border-white/[0.1] text-indigo-100 hover:scale-105 shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                      }`}
                      style={{ 
                        left: `${sliderValue}px`,
                        transition: sliderValue === 0 
                          ? 'left 0.3s ease-out, background-color 0.3s, transform 0.1s' 
                          : 'background-color 0.3s, transform 0.1s'
                      }}
                    >
                      {isCaptchaSuccess ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <ArrowRight className="w-5 h-5" />
                      )}
                    </div>
                    
                    {/* Real HTML Range Input for accessibility and native touch/mouse events */}
                    <input 
                      type="range" 
                      min="0" 
                      max="224" 
                      value={sliderValue}
                      disabled={isCaptchaSuccess}
                      onChange={(e) => {
                        setSliderValue(parseInt(e.target.value, 10));
                        setCaptchaError(null);
                      }}
                      onMouseUp={handleVerifySlider}
                      onTouchEnd={handleVerifySlider}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </div>
                  
                  {captchaError && (
                    <p className="text-[#ef5350] text-[11px] font-bold mt-3 font-hud tracking-wide animate-pulse">
                      {captchaError}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold tracking-wider mb-2 uppercase text-glow-purple font-title">
                  {lang === 'zh' ? '用户协议与隐私条款' : 'Terms & Privacy Policy'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4 font-hud">
                  {lang === 'zh' 
                    ? '进入网站首页前，请阅读并同意 HAPPY Games 的用户使用协议与隐私条款。严禁任何二次开发行为。'
                    : 'Please read and agree to the terms below to enter the website. Secondary development is strictly prohibited.'}
                </p>

                {/* Scrollable Terms Content */}
                <div className="h-44 overflow-y-auto bg-black/50 p-4 rounded-2xl border border-white/[0.06] text-left text-xs text-slate-400 mb-5 font-hud leading-relaxed scrollbar-thin select-none">
                  <p className="font-bold text-slate-200 mb-2">【HAPPY Games 用户使用协议与隐私条款】</p>
                  <p className="mb-2">感谢您访问本网站。进入网站及游玩前，请务必仔细阅读并同意以下条款：</p>
                  <ol className="list-decimal list-inside space-y-2 text-[11px]">
                    <li><span className="font-bold text-slate-200">未经授权禁止二次开发</span>：本网站所有代码、逻辑、美术及交互设计均归作者 HAPPY Games 本人所有。未经作者明确书面同意，严禁以任何形式（包括但不限于修改代码、提取资源、二次分发等）进行二次开发或商业化使用。如有沟通需求，请联系官方邮箱：<span className="text-indigo-400 font-bold">happy_games@vip.qq.com</span>。</li>
                    <li><span className="font-bold text-slate-200">手势识别与相机隐私</span>：游戏使用 Google MediaPipe 进行本地手势识别与定位。您的摄像头画面仅在您的浏览器内存中进行实时计算，<span className="text-emerald-400 font-bold">绝不会上传到任何远端服务器</span>，我们非常重视您的隐私。</li>
                    <li><span className="font-bold text-slate-200">AI 战术助手声明</span>：当开启 AI 助手模式时，系统会将抽象的 2D 泡泡棋盘数据截图发送至 Google Gemini 2.5 Flash API 以获取战术推荐，此截图<span className="text-emerald-400 font-bold">绝对不包含</span>任何摄像头画面、人脸或您的个人身份隐私。</li>
                    <li><span className="font-bold text-slate-200">服务保障与免责声明</span>：本项目仅供个人非商业化学习娱乐使用。在多手势或复杂光线下，检测精度可能会发生合理偏移，请以实际显示为准。</li>
                  </ol>
                </div>

                {/* Consent Checkbox */}
                <label className="flex items-start gap-3 mb-5 cursor-pointer text-left select-none max-w-[340px] mx-auto">
                  <input 
                    type="checkbox"
                    checked={isTermsChecked}
                    disabled={termsTimer > 0}
                    onChange={(e) => setIsTermsChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded bg-black/45 border border-white/[0.1] text-indigo-500 focus:ring-indigo-500/50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span className={`text-[10px] font-bold leading-normal font-hud ${termsTimer > 0 ? 'text-slate-500' : 'text-slate-300'}`}>
                    我已阅读并同意上述用户协议、隐私条款及授权说明，并承诺不进行任何二次开发。
                  </span>
                </label>

                {/* Action Submit Button */}
                <button
                  onClick={() => {
                    setIsGateUnlocked(true);
                  }}
                  disabled={termsTimer > 0 || !isTermsChecked}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:from-[#4f46e5] hover:to-[#7c3aed] text-white font-bold text-xs uppercase tracking-widest shadow-lg transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 font-hud"
                >
                  {termsTimer > 0 
                    ? (lang === 'zh' ? `请阅读条款并等待 (${termsTimer}s)` : `Read and wait (${termsTimer}s)`)
                    : (lang === 'zh' ? '同意协议并进入网站' : 'Agree and Enter Site')}
                </button>
              </>
            )}

            {/* Support email info */}
            <p className="text-[10px] text-gray-500 mt-6 font-hud tracking-wider uppercase">
              {lang === 'zh' ? '联系与反馈：' : 'Contact & Inquiries: '}
              <a href="mailto:happy_games@vip.qq.com" className="text-indigo-400 hover:underline">happy_games@vip.qq.com</a>
            </p>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default GeminiSlingshot;