import {
  Activity,
  Bot,
  CheckCircle,
  Copy,
  Cpu,
  HelpCircle,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { ShippingContainer, SpecialOrder } from '../types';
import { askJarvisCopilot } from '../utils/apiSync';

interface JarvisCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: SpecialOrder[];
  containers: ShippingContainer[];
  onNavigateTab?: (tab: string) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  timestamp: string;
  contextSummary?: any;
}

export const JarvisCopilotModal: React.FC<JarvisCopilotModalProps> = ({
  isOpen,
  onClose,
  orders,
  containers,
  onNavigateTab,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'jarvis',
      text: `Hola, soy **JARVIS CEDIS Logistics AI**. Estoy conectado a la base de datos viva de Changan Auto Panamá.\n\nPuedo rastrear **cualquier código de repuesto** al instante: le indicaré si fue solicitado por alguna sucursal (orden, cliente, modelo, placa) o si viene en algún contenedor en tránsito o recibido en bodega CEDIS.\n\nTambién puedo generar informes ejecutivos, cuellos de botella y órdenes listas para despacho. ¿Qué desea consultar?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    '¿El repuesto S111F260204 fue solicitado o viene en contenedores?',
    '¿Cuáles son los repuestos críticos que faltan por llegar?',
    '¿Qué pedidos están al 100% listos para despacho?',
    'Analizar el Fill Rate y rendimiento por sucursal',
    '¿Hay órdenes listas en bodega sin factura cancelada?',
    'Estado de los contenedores en tránsito y aduana',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Voice speech synthesis
  const speakText = (text: string) => {
    if (!voiceSpeechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      // Clean markdown symbols for cleaner TTS
      const clean = text.replace(/[*_#`•-]/g, ' ').replace(/\n+/g, '. ');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'es-PA';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignored
    }
  };

  // Voice speech recognition
  const toggleVoiceRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('El reconocimiento de voz por micrófono no es soportado por este navegador.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-PA';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSendQuery(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleSendQuery = async (queryText?: string) => {
    const promptToSend = (queryText || input).trim();
    if (!promptToSend || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}-u`,
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await askJarvisCopilot(promptToSend);
      const jarvisMsg: Message = {
        id: `msg-${Date.now()}-j`,
        sender: 'jarvis',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contextSummary: res.contextSummary,
      };
      setMessages((prev) => [...prev, jarvisMsg]);
      speakText(res.answer);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          sender: 'jarvis',
          text: 'Disculpe, ocurrió una interrupción en el enlace neuronal. Por favor intente nuevamente.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#07090e] border border-cyan-500/40 rounded-2xl w-full max-w-4xl h-[90vh] max-h-[780px] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden relative">
        {/* Holographic glowing scan line effect */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse pointer-events-none" />

        {/* Header HUD */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_18px_rgba(6,182,212,0.5)] border border-cyan-400/40 relative">
              <Bot className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#07090e] shadow-[0_0_8px_#10b981]"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-cyan-400 uppercase">
                  CEDIS LOGISTICS AI CORE // v3.7
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                  GEMINI ONLINE
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                JARVIS CEDIS Logistics Copilot
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVoiceSpeechEnabled(!voiceSpeechEnabled)}
              className={`p-2 rounded-xl text-xs font-mono transition-colors border ${
                voiceSpeechEnabled
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={voiceSpeechEnabled ? 'Desactivar voz de JARVIS' : 'Activar voz de JARVIS (TTS)'}
            >
              {voiceSpeechEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                setMessages([
                  {
                    id: 'init-clean',
                    sender: 'jarvis',
                    text: 'Memoria de conversación reiniciada. Base de datos operativa sincronizada en tiempo real. ¿En qué le puedo asistir?',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ]);
              }}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-colors"
              title="Limpiar conversación"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
              title="Cerrar JARVIS"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Telemetry Status Bar */}
        <div className="bg-slate-950/95 border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>
              Órdenes Activas: <strong className="text-white font-bold">{orders.length}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              Contenedores: <strong className="text-cyan-400 font-bold">{containers.length}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              Listos Despacho:{' '}
              <strong className="text-emerald-400 font-bold">
                {orders.filter((o) => o.status === 'completado').length}
              </strong>
            </span>
          </div>

          <div className="text-cyan-400/80 text-[10px]">
            Conectado a CEDIS Panamá Central
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 font-sans text-sm">
          {messages.map((m) => {
            const isJarvis = m.sender === 'jarvis';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isJarvis ? 'justify-start' : 'justify-end'}`}
              >
                {isJarvis && (
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    <Cpu className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 shadow-md ${
                    isJarvis
                      ? 'bg-slate-900/90 border border-slate-800 text-slate-200'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                      {isJarvis ? 'JARVIS AI LOGISTICS' : 'USUARIO AUTORIZADO'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 opacity-80">{m.timestamp}</span>
                  </div>

                  <div className="prose prose-invert max-w-none text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0 animate-spin">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-xs font-mono text-cyan-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Analizando base de datos logística y resolviendo cruces...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Carousel */}
        <div className="p-2 sm:p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono uppercase text-slate-500 whitespace-nowrap pl-1">
            Consultas Rápidas:
          </span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(qp)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-cyan-300 whitespace-nowrap transition-colors flex-shrink-0"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleVoiceRecognition}
            className={`p-2.5 rounded-xl border transition-all ${
              isListening
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-[0_0_15px_#f43f5e]'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border-slate-800'
            }`}
            title={isListening ? 'Escuchando... Haga clic para detener' : 'Hablar por micrófono (Dictado por Voz)'}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendQuery();
              }
            }}
            placeholder="Pregunte a JARVIS sobre repuestos, contenedores, órdenes, sucursales o reportes..."
            className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
          />

          <button
            onClick={() => handleSendQuery()}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Enviar</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
