'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const ITEMS_PER_PAGE = 7;

export default function Home() {
  const [players, setPlayers] = useState<any[]>([]);
  const [areGamesRevealed, setAreGamesRevealed] = useState(false);
  
  const [filterCategory, setFilterCategory] = useState<'all' | 'minecraft' | 'clash' | 'fifa'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      const { data: settingsData } = await supabase.from('settings').select('are_games_revealed').eq('id', 1).single();
      if (settingsData) {
        setAreGamesRevealed(settingsData.are_games_revealed);
      }

      const { data: playersData } = await supabase.from('players').select('*');
      if (playersData) setPlayers(playersData);
    };

    fetchData();

    const settingsSub = supabase.channel('settings-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
        setAreGamesRevealed(payload.new.are_games_revealed);
      }).subscribe();

    const playersSub = supabase.channel('players-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, async () => {
        const { data } = await supabase.from('players').select('*');
        if (data) setPlayers(data);
      }).subscribe();

    return () => {
      supabase.removeChannel(settingsSub);
      supabase.removeChannel(playersSub);
    };
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterCategory]);

  const { podiumPlayers, filteredPlayers } = useMemo(() => {
    // 1. Ordenamos por la categoría seleccionada
    let sorted = [...players];
    if (filterCategory === 'minecraft') sorted.sort((a, b) => b.mc - a.mc);
    else if (filterCategory === 'clash') sorted.sort((a, b) => b.cr - a.cr);
    else if (filterCategory === 'fifa') sorted.sort((a, b) => b.fifa - a.fifa);
    else sorted.sort((a, b) => b.total - a.total);

    // 2. Asignamos la posición real (rango) a cada jugador y aseguramos el Podio
    const ranked = sorted.map((player, index) => ({ ...player, rank: index + 1 }));
    const podium = ranked.slice(0, 3);

    // 3. Filtro de búsqueda a prueba de errores y acentos
    let filtered = ranked;
    if (searchQuery.trim() !== '') {
      // Convertimos a minúsculas y eliminamos acentos de la búsqueda
      const q = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      filtered = ranked.filter(p => {
        // Protegemos contra nulos, pasamos a minúsculas y quitamos acentos
        const nameSafe = p.name ? p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        const tagSafe = p.gamertag ? p.gamertag.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        
        return nameSafe.includes(q) || tagSafe.includes(q);
      });
    }

    return { podiumPlayers: podium, filteredPlayers: filtered };
  }, [players, filterCategory, searchQuery]);

  const top3 = podiumPlayers;
  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const paginatedPlayers = filteredPlayers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="w-full pt-20 bg-background relative overflow-hidden min-h-screen">
      
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface/85 backdrop-blur-xl shadow-[0_1px_16px_rgba(0,0,0,0.6)] border-b border-outline-variant/30">
        <div className="h-20 w-full px-4 md:px-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => scrollToSection('inicio')}>
            <div className="flex flex-col">
              <span className="font-display text-xl uppercase tracking-wide text-primary-container leading-none font-bold">WIEEEK</span>
              <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Edición Videojuegos</span>
            </div>
          </div>
          <nav className="hidden lg:flex items-center gap-2 p-1 bg-surface-container-lowest/80 backdrop-blur-md rounded-lg shadow-inner border border-outline-variant/20">
            <button onClick={() => scrollToSection('inicio')} className="font-mono text-xs uppercase tracking-wider px-4 py-2 hover:bg-surface-container transition-all text-on-surface rounded">Inicio</button>
            {areGamesRevealed && <button onClick={() => scrollToSection('clasificacion')} className="font-mono text-xs uppercase tracking-wider px-4 py-2 hover:bg-surface-container transition-all text-on-surface rounded">Clasificación</button>}
            <button onClick={() => setShowRules(true)} className="font-mono text-xs uppercase tracking-wider px-4 py-2 hover:bg-surface-container transition-all text-on-surface rounded">Reglas</button>
          </nav>
        </div>
      </header>

      {/* PASARELA DE LOGOS INSTITUCIONALES (SEAMLESS LOOP) */}
      <div className="w-full overflow-hidden border-b border-primary-container/30 bg-surface-container-lowest py-3 flex relative z-10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex w-max hover:pause">
          <div className="animate-marquee flex gap-16 items-center px-8 shrink-0">
            {[1, 2, 3].map((group) => (
              <div key={`p1-${group}`} className="flex gap-16 items-center shrink-0">
                <img src="/logos/logo-ieee.png" alt="IEEE ESTL" className="h-12 object-contain grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
                <img src="/logos/logo-wieeek.png" alt="WIEEEK" className="h-12 object-contain grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
                <img src="/logos/logo-uaeh.png" alt="UAEH" className="h-12 object-contain grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
              </div>
            ))}
          </div>
          <div className="animate-marquee flex gap-16 items-center px-8 shrink-0">
            {[1, 2, 3].map((group) => (
              <div key={`p2-${group}`} className="flex gap-16 items-center shrink-0">
                <img src="/logos/logo-ieee.png" alt="IEEE ESTL" className="h-12 object-contain grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
                <img src="/logos/logo-wieeek.png" alt="WIEEEK" className="h-12 object-contain grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
                <img src="/logos/logo-uaeh.png" alt="UAEH" className="h-12 object-contain grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BACKGROUND AURORA LÍQUIDA (VERSIÓN CORREGIDA) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-background">
        
        {/* Orbe Cian (Flotando) */}
        <motion.div 
          animate={{ 
            x: ["-20%", "20%", "-10%", "-20%"],
            y: ["-10%", "10%", "-20%", "-10%"],
          }} 
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-primary-container/30 rounded-full blur-[140px]"
        />
        
        {/* Orbe Morado/Oscuro (Flotando en sentido contrario) */}
        <motion.div 
          animate={{ 
            x: ["20%", "-20%", "10%", "20%"],
            y: ["20%", "-10%", "10%", "20%"],
          }} 
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] -right-[10%] w-[80vw] h-[80vw] bg-secondary-fixed/20 rounded-full blur-[150px]"
        />
        
        {/* Capa de cristal para suavizar y mezclar los colores */}
        <div className="absolute inset-0 bg-background/40 backdrop-blur-[60px]"></div>
      </div>

      {/* HERO SECTION */}
      <section id="inicio" className="relative z-10 w-full px-4 md:px-10 py-16 flex flex-col items-center text-center scroll-mt-24">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-high/80 backdrop-blur-md shadow-[0_0_16px_rgba(0,240,255,0.2)] border border-outline-variant/30 mb-8">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary-fixed animate-ping"></span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-primary-container">Cupo Lleno • Torneo en Curso</span>
        </div>
        
        <div className="relative max-w-4xl flex flex-col items-center">
          <h1 className="text-4xl md:text-7xl font-display font-bold uppercase tracking-tighter text-on-surface">
            Torneo E-Sports <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-primary to-secondary-fixed">WIEEEK</span>
          </h1>
        </div>

        {/* TARJETAS DE JUEGOS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mt-12 mb-8">
          {areGamesRevealed ? (
            <>
              <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-surface-container-low/90 border border-outline-variant/20 shadow-lg group">
                <div className="w-10 h-10 rounded flex items-center justify-center bg-tertiary-container/15 text-tertiary-fixed"><span className="material-symbols-outlined">grid_view</span></div>
                <div className="text-left">
                  <span className="block font-mono text-[10px] uppercase text-tertiary-fixed font-semibold">Supervivencia & PVP</span>
                  <span className="block font-display text-lg text-on-surface">Minecraft</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-surface-container-low/90 border border-outline-variant/20 shadow-lg group">
                <div className="w-10 h-10 rounded flex items-center justify-center bg-secondary-container/20 text-secondary-fixed"><span className="material-symbols-outlined">military_tech</span></div>
                <div className="text-left">
                  <span className="block font-mono text-[10px] uppercase text-secondary-fixed font-semibold">Duelos 1v1 Arena</span>
                  <span className="block font-display text-lg text-on-surface">Clash Royale</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-surface-container-low/90 border border-outline-variant/20 shadow-lg group">
                <div className="w-10 h-10 rounded flex items-center justify-center bg-primary-container/15 text-primary-fixed"><span className="material-symbols-outlined">sports_soccer</span></div>
                <div className="text-left">
                  <span className="block font-mono text-[10px] uppercase text-primary-fixed font-semibold">Copa Eliminatoria</span>
                  <span className="block font-display text-lg text-on-surface">FIFA / FC</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center justify-center gap-3 p-4 rounded-lg bg-surface-container-highest/50 border border-outline-variant/20 relative overflow-hidden">
                  <div className="absolute inset-0 backdrop-blur-[2px]"></div>
                  <div className="w-10 h-10 rounded flex items-center justify-center bg-surface-container text-outline relative z-10"><span className="material-symbols-outlined">lock</span></div>
                  <div className="text-left relative z-10">
                    <span className="block font-mono text-[10px] uppercase text-outline font-semibold">Clasificado</span>
                    <span className="block font-display text-lg text-on-surface-variant blur-[3px] select-none">Juego {num}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {/* CLASIFICACION ANIMADA */}
      <section id="clasificacion" className="relative z-10 w-full px-4 md:px-10 py-16 flex flex-col items-center">
        {areGamesRevealed ? (
          <>
            <h2 className="text-3xl md:text-4xl font-display uppercase tracking-tight text-on-surface mb-12 text-center">Tabla de Clasificación</h2>
            
            {/* PODIO TOP 3 CON ANIMACIONES DE FLOTACIÓN */}
            {top3.length >= 3 && (
              <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 pt-8 pb-8 px-4">
                
                {/* SUBCAMPEÓN (#2) */}
                <motion.div 
                  initial={{ opacity: 0, x: -50 }} 
                  animate={{ opacity: 1, x: 0, y: [0, -8, 0] }} 
                  transition={{ 
                    opacity: { duration: 0.5, delay: 0.2 },
                    x: { duration: 0.5, delay: 0.2 },
                    y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
                  }}
                  whileHover={{ scale: 1.02 }}
                  className="order-2 md:order-1 bg-surface-container-low p-6 rounded-xl flex flex-col items-center text-center border border-outline-variant/30 shadow-[0_10px_20px_rgba(0,0,0,0.2)]"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface mb-2 font-bold text-xl">#2</div>
                  <span className="text-xl font-bold text-on-surface">{top3[1].name}</span>
                  <span className="font-mono text-[10px] text-outline uppercase tracking-wider mt-1">Subcampeón</span>
                  <span className="text-3xl font-bold text-on-surface mt-2">{filterCategory === 'minecraft' ? top3[1].mc : filterCategory === 'clash' ? top3[1].cr : filterCategory === 'fifa' ? top3[1].fifa : top3[1].total} <span className="text-sm text-outline">PTS</span></span>
                </motion.div>
                
                {/* LÍDER ABSOLUTO (#1) */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: [0, -12, 0],
                    boxShadow: [
                      "0px 5px 20px rgba(255,215,0,0.15)",
                      "0px 15px 40px rgba(255,215,0,0.4)",
                      "0px 5px 20px rgba(255,215,0,0.15)"
                    ]
                  }} 
                  transition={{ 
                    opacity: { duration: 0.5 },
                    scale: { type: "spring", bounce: 0.5, duration: 0.8 },
                    y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 },
                    boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }
                  }}
                  whileHover={{ scale: 1.05 }}
                  className="order-1 md:order-2 bg-surface-container p-6 rounded-xl flex flex-col items-center text-center relative border border-secondary-fixed/40 z-10"
                >
                  <div className="absolute -top-3 px-4 py-1 rounded-full bg-secondary-fixed text-background font-mono text-[10px] font-bold uppercase tracking-widest shadow">Líder Absoluto</div>
                  <div className="w-14 h-14 rounded-full bg-secondary-fixed/20 text-secondary-fixed flex items-center justify-center mb-2 shadow-[0_0_16px_rgba(255,215,0,0.5)]">
                    <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                  </div>
                  <span className="text-2xl font-bold text-on-surface">{top3[0].name}</span>
                  <span className="font-mono text-xs text-secondary-fixed uppercase tracking-wider font-semibold mt-1">1° Lugar General</span>
                  <span className="text-5xl font-bold text-primary-fixed mt-2">{filterCategory === 'minecraft' ? top3[0].mc : filterCategory === 'clash' ? top3[0].cr : filterCategory === 'fifa' ? top3[0].fifa : top3[0].total} <span className="text-sm text-primary-container">PTS</span></span>
                </motion.div>
                
                {/* TERCER LUGAR (#3) */}
                <motion.div 
                  initial={{ opacity: 0, x: 50 }} 
                  animate={{ opacity: 1, x: 0, y: [0, -6, 0] }} 
                  transition={{ 
                    opacity: { duration: 0.5, delay: 0.4 },
                    x: { duration: 0.5, delay: 0.4 },
                    y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }
                  }}
                  whileHover={{ scale: 1.02 }}
                  className="order-3 bg-surface-container-low p-6 rounded-xl flex flex-col items-center text-center border border-outline-variant/30 shadow-[0_10px_20px_rgba(0,0,0,0.2)]"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface mb-2 font-bold text-xl">#3</div>
                  <span className="text-xl font-bold text-on-surface">{top3[2].name}</span>
                  <span className="font-mono text-[10px] text-outline uppercase tracking-wider mt-1">3er Lugar</span>
                  <span className="text-3xl font-bold text-on-surface mt-2">{filterCategory === 'minecraft' ? top3[2].mc : filterCategory === 'clash' ? top3[2].cr : filterCategory === 'fifa' ? top3[2].fifa : top3[2].total} <span className="text-sm text-outline">PTS</span></span>
                </motion.div>
                
              </div>
            )}

            {/* CONTROLES DE BÚSQUEDA Y FILTROS */}
            <div className="w-full max-w-5xl flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
              <div className="relative w-full md:w-96">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input 
                  type="text" 
                  placeholder="Buscar jugador o gamertag..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface pl-10 pr-4 py-2.5 rounded border border-outline-variant/30 focus:border-primary-container focus:outline-none transition-colors"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <button onClick={() => setFilterCategory('all')} className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-all ${filterCategory === 'all' ? 'bg-primary-container text-background font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}`}>Global</button>
                <button onClick={() => setFilterCategory('minecraft')} className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-all ${filterCategory === 'minecraft' ? 'bg-tertiary-fixed text-background font-bold shadow-[0_0_15px_rgba(200,255,100,0.3)]' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}`}>Minecraft</button>
                <button onClick={() => setFilterCategory('clash')} className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-all ${filterCategory === 'clash' ? 'bg-secondary-fixed text-background font-bold shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}`}>Clash Royale</button>
                <button onClick={() => setFilterCategory('fifa')} className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-all ${filterCategory === 'fifa' ? 'bg-primary-fixed text-background font-bold shadow-[0_0_15px_rgba(100,150,255,0.3)]' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}`}>FIFA / FC</button>
              </div>
            </div>

            <div className="w-full max-w-5xl bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-high/60 text-on-surface-variant font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-4 px-4 text-center">POS</th>
                    <th className="py-4 px-4">JUGADOR</th>
                    <th className="py-4 px-4 text-right">Minecraft</th>
                    <th className="py-4 px-4 text-right">Clash Royale</th>
                    <th className="py-4 px-4 text-right">FIFA</th>
                    <th className="py-4 px-4 text-right text-primary-container">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  <AnimatePresence mode="wait">
                    {paginatedPlayers.length === 0 ? (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <td colSpan={6} className="py-8 text-center text-outline">No se encontraron jugadores.</td>
                      </motion.tr>
                    ) : (
                      paginatedPlayers.map((player, idx) => (
                        <motion.tr 
                          key={player.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          whileHover={{ 
                            scale: 1.01, 
                            backgroundColor: "rgba(0, 240, 255, 0.05)",
                            boxShadow: "inset 4px 0 0 rgba(0, 240, 255, 1)"
                          }}
                          transition={{ duration: 0.2, delay: idx * 0.03 }}
                          className="cursor-pointer bg-surface-container-lowest border-b border-surface-container transition-all"
                        >
                          <td className="py-3 px-4 text-center font-bold text-on-surface-variant">#{player.rank}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-on-surface">{player.name}</div>
                            <div className="font-mono text-[10px] text-outline uppercase">{player.gamertag}</div>
                          </td>
                          <td className="py-3 px-4 text-right">{player.mc} pts</td>
                          <td className="py-3 px-4 text-right">{player.cr} pts</td>
                          <td className="py-3 px-4 text-right">{player.fifa} pts</td>
                          <td className="py-3 px-4 text-right font-bold text-lg text-primary-container">{player.total} pts</td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="px-4 py-3 bg-surface-container border-t border-surface-container flex justify-between items-center">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-surface-container-high text-on-surface font-mono text-xs uppercase rounded disabled:opacity-50">Anterior</button>
                  <span className="font-mono text-xs text-outline">Página {currentPage} de {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-surface-container-high text-on-surface font-mono text-xs uppercase rounded disabled:opacity-50">Siguiente</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full max-w-3xl py-20 flex flex-col items-center justify-center text-center bg-surface-container-lowest/50 border border-outline-variant/30 rounded-2xl mt-12">
            <span className="material-symbols-outlined text-5xl text-outline mb-4">visibility_off</span>
            <h3 className="text-2xl font-bold text-on-surface uppercase tracking-tight mb-2">Clasificación Oculta</h3>
            <p className="text-on-surface-variant max-w-md">Para mantener la intriga del torneo, la tabla de posiciones se habilitará una vez que los juegos oficiales sean revelados.</p>
          </div>
        )}
      </section>

      {/* FOOTER COMPLETO */}
      <footer className="w-full border-t border-outline-variant/30 bg-surface-container-lowest py-10 mt-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <span className="font-display text-xl font-bold text-on-surface uppercase tracking-wider">WIEEEK 2026</span>
            <span className="font-mono text-[10px] text-outline uppercase tracking-widest mt-1">Torneo E-Sports Oficial</span>
            <div className="flex gap-4 mt-4">
              <a href="#" className="text-outline hover:text-primary-container transition-colors" title="Instagram">
                <span className="material-symbols-outlined text-xl">photo_camera</span>
              </a>
              <a href="#" className="text-outline hover:text-primary-container transition-colors" title="Facebook">
                <span className="material-symbols-outlined text-xl">thumb_up</span>
              </a>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Organizado por</span>
            <a 
              href="https://ieee-estl.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 group hover:scale-105 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-primary-container text-[22px] group-hover:text-primary-fixed">bolt</span>
              <span className="font-bold text-primary-container uppercase tracking-wider text-sm group-hover:text-primary-fixed group-hover:underline underline-offset-4">
                Rama Estudiantil IEEE UAEH ESTL
              </span>
            </a>
          </div>

          <div className="flex flex-col items-center md:items-end">
            <span className="font-mono text-[10px] text-outline uppercase tracking-widest flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">terminal</span> Desarrollado con Next.js
            </span>
            <span className="font-mono text-[10px] text-outline uppercase tracking-widest mt-1">© 2026 Todos los derechos reservados</span>
            <button onClick={() => setShowRules(true)} className="font-mono text-[10px] text-outline/60 uppercase tracking-widest mt-3 hover:text-primary-container transition-colors cursor-pointer">
              Ver Reglamento del Torneo
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}