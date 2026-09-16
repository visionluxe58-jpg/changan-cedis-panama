import React, { useState } from 'react';
import { ZoomIn, ExternalLink } from 'lucide-react';
import { servicioImagenesRepuestos } from '../services/servicioImagenesRepuestos';

interface MiniaturaPiezaEPCProps {
  codigo: string;
  descripcion: string;
  subsistema?: string;
  onClick?: () => void;
  tamano?: 'sm' | 'md' | 'lg';
  mostrarBotonAmpliar?: boolean;
}

export const MiniaturaPiezaEPC: React.FC<MiniaturaPiezaEPCProps> = ({
  codigo,
  descripcion,
  onClick,
  tamano = 'md',
  mostrarBotonAmpliar = true
}) => {
  const [errorImagen, setErrorImagen] = useState<boolean>(false);
  const fotoUrl = servicioImagenesRepuestos.obtenerFotoRepuesto(codigo, descripcion);

  // Dimensiones del recuadro fotográfico estilo e-commerce / catálogo oficial
  const dimensiones = {
    sm: 'w-12 h-10',
    md: 'w-20 h-16',
    lg: 'w-28 h-24'
  }[tamano];

  return (
    <div 
      onClick={onClick}
      className={`relative ${dimensiones} rounded-lg bg-white border border-slate-200 hover:border-sky-500 p-0.5 flex items-center justify-center overflow-hidden shadow-sm hover:shadow-md transition-all group cursor-pointer shrink-0 select-none`}
      title={`Ver fotografía real y despiece: ${descripcion} (${codigo})`}
    >
      {!errorImagen && fotoUrl ? (
        <img 
          src={fotoUrl} 
          alt={descripcion}
          onError={() => setErrorImagen(true)}
          className="w-full h-full object-cover rounded-md group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />
      ) : (
        /* Respaldo técnico si no hay conexión externa */
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-[9px] text-slate-500 font-mono text-center p-1">
          <span className="font-bold text-slate-700">{codigo.substring(0, 7)}</span>
          <span className="text-[8px] text-slate-400">Genuino</span>
        </div>
      )}

      {/* Hover Zoom Overlay */}
      {mostrarBotonAmpliar && (
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
          <ZoomIn className="w-4 h-4 text-white drop-shadow" />
        </div>
      )}
    </div>
  );
};
