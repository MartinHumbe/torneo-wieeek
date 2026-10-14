'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ITEMS_PER_PAGE = 7;

export default function Home() {
  const [players, setPlayers] = useState<any[]>([]);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [areGamesRevealed, setAreGamesRevealed] = useState(true); // NUEVO ESTADO
  
  const [filterCategory, setFilterCategory] = useState<'all' | 'minecraft' | 'clash' | 'fifa'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      const { data: settingsData } = await supabase.from('settings').select('is_registration_open, are_games_revealed').eq('id', 1).single();
      if (settingsData) {
        setIsRegistrationOpen(settingsData.is_registration_open);
        setAreGamesRevealed(settingsData.are_games_revealed);
      }

      const { data: playersData } = await supabase.from('players').select('*');
      if (playersData) setPlayers(playersData);
    };

    fetchData();

    const settingsSub = supabase.channel('settings-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
        setIsRegistrationOpen(payload.new.is_registration_open);
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

  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = [...players];
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.gamertag.toLowerCase().includes(q));
    }
    if (filterCategory === 'minecraft') filtered.sort((a, b) => b.mc - a.mc);
    else if (filterCategory === 'clash') filtered.sort((a, b) => b.cr - a.cr);
    else if (filterCategory === 'fifa') filtered.sort((a, b) => b.fifa - a.fifa);
    else filtered.sort((a, b) => b.total - a.total);
    return filtered;
  }, [players, filterCategory, searchQuery]);

  const top3 = filteredAndSortedPlayers.slice(0, 3);
  const totalPages = Math.ceil(filteredAndSortedPlayers.length / ITEMS_PER_PAGE);
  const paginatedPlayers = filteredAndSortedPlayers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const whatsapp = formData.get('whatsapp') as string;
    const account = formData.get('accountNumber') as string;

    if (whatsapp.length !== 10 || !/^\d{10}$/.test(whatsapp)) {
      alert('El número de WhatsApp debe tener exactamente 10 dígitos numéricos.');
      return;
    }

    const { data: existingUser } = await supabase.from('players').select('id').eq('account', account);
    if (existingUser && existingUser.length > 0) {
      alert(`La cuenta UAEH ${account} ya está registrada en el torneo.`);
      return;
    }

    const { error } = await supabase.from('players').insert([{
      name: formData.get('fullName'),
      semester: formData.get('semester'),
      account: account,
      whatsapp: whatsapp,
      gamertag: formData.get('gamertag'),
      mc: 0, cr: 0, fifa: 0, total: 0
    }]);

    if (error) {
      alert('Hubo un error al registrarte. Intenta de nuevo.');
      return;
    }

    setShowSuccess(true);
    form.reset();
  };

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
            <button onClick={() => scrollToSection('registro')} className="font-mono text-xs uppercase tracking-wider px-4 py-2 hover:bg-surface-container transition-all text-on-surface rounded">Registro</button>
            {areGamesRevealed && <button onClick={() => scrollToSection('clasificacion')} className="font-mono text-xs uppercase tracking-wider px-4 py-2 hover:bg-surface-container transition-all text-on-surface rounded">Clasificación</button>}
          </nav>
        </div>
      </header>

      {/* PASARELA DE LOGOS INSTITUCIONALES (SEAMLESS LOOP) */}
      <div className="w-full overflow-hidden border-b border-primary-container/30 bg-surface-container-lowest py-3 flex relative z-10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        {/* Contenedor Flex para alinear las dos pistas idénticas */}
        <div className="flex w-max hover:pause">
          
          {/* Pista 1 */}
          <div className="animate-marquee flex gap-16 items-center px-8 shrink-0">
            {[1, 2, 3].map((group) => (
              <div key={`p1-${group}`} className="flex gap-16 items-center shrink-0">
                <img src="/logos/logo-ieee.png" alt="IEEE ESTL" className="h-10 object-contain grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
                <img src="/logos/logo-wieeek.png" alt="WIEEEK" className="h-10 object-contain grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
                <img src="/logos/logo-uaeh.png" alt="UAEH" className="h-10 object-contain grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
              </div>
            ))}
          </div>

          {/* Pista 2 (Clon exacto para el loop infinito perfecto) */}
          <div className="animate-marquee flex gap-16 items-center px-8 shrink-0">
            {[1, 2, 3].map((group) => (
              <div key={`p2-${group}`} className="flex gap-16 items-center shrink-0">
                <img src="/logos/ieee.png" alt="IEEE ESTL" className="h-10 object-contain grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
                <img src="/logos/wieeek.png" alt="WIEEEK" className="h-10 object-contain grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
                <img src="/logos/uaeh.png" alt="UAEH" className="h-10 object-contain grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
              </div>
            ))}
          </div>

        </div>
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[340px] bg-secondary-container/20 rounded-full blur-[140px] pointer-events-none"></div>

      {/* HERO SECTION */}
      <section id="inicio" className="relative w-full px-4 md:px-10 py-16 flex flex-col items-center text-center scroll-mt-24">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-high/80 backdrop-blur-md shadow-[0_0_16px_rgba(0,240,255,0.2)] border border-outline-variant/30 mb-8">
          <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container animate-ping"></span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-primary-container">Inscripciones {isRegistrationOpen ? 'Abiertas' : 'Cerradas'} • Fase Beta</span>
        </div>
        
        <div className="relative max-w-4xl flex flex-col items-center">
          <h1 className="text-4xl md:text-7xl font-display font-bold uppercase tracking-tighter text-on-surface">
            Torneo E-Sports <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-primary to-secondary-fixed">WIEEEK</span>
          </h1>
        </div>

        {/* TARJETAS DE JUEGOS (Censuradas o Reveladas) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mt-12">
          {areGamesRevealed ? (
            <>
              {/* Juegos Revelados */}
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
              {/* Juegos Censurados */}
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center justify-center gap-3 p-4 rounded-lg bg-surface-container-highest/50 border border-outline-variant/20 relative overflow-hidden">
                  <div className="absolute inset-0 backdrop-blur-[2px]"></div>
                  <div className="w-10 h-10 rounded flex items-center justify-center bg-surface-container text-outline relative z-10"><span className="material-symbols-outlined">lock</span></div>
                  <div className="text-left relative z-10">
                    <span className="block font-mono text-[10px] uppercase text-outline font-semibold">Clasificado</span>
                    <span className="block font-display text-lg text-on-surface-variant blur-[3px] select-none">Juego{num}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
          <button 
            disabled={!isRegistrationOpen}
            onClick={() => isRegistrationOpen && scrollToSection('registro')} 
            className={`inline-flex items-center gap-2 px-10 py-4 rounded font-display text-lg uppercase tracking-wider font-bold transition-all ${isRegistrationOpen ? 'bg-primary-container text-background shadow-[0_0_28px_rgba(0,240,255,0.5)] hover:shadow-[0_0_40px_rgba(0,240,255,0.8)] hover:scale-105 cursor-pointer' : 'bg-surface-container-high text-outline cursor-not-allowed opacity-80'}`}
          >
            <span>{isRegistrationOpen ? 'Inscribirse Ahora' : 'Se abrirá pronto'}</span>
            <span className="material-symbols-outlined font-bold">{isRegistrationOpen ? 'arrow_downward' : 'lock'}</span>
          </button>
        </div>
      </section>

      {/* REGISTRATION SECTION */}
      <section id="registro" className="w-full px-4 md:px-10 py-16 flex flex-col items-center scroll-mt-24 relative z-10">
        <h2 className="text-3xl md:text-4xl font-display uppercase tracking-tight text-on-surface mb-8">
          Registro de Participantes
        </h2>
        <div className="w-full max-w-xl bg-surface-container/85 backdrop-blur-xl rounded-xl p-6 md:p-10 border border-outline-variant/30 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          <div className="mb-6 p-4 rounded bg-surface-container-highest/60 border border-secondary-container/40 flex items-start gap-3">
            <span className="material-symbols-outlined text-secondary-fixed mt-0.5">local_fire_department</span>
            <div className="flex flex-col">
              <span className="text-secondary-fixed font-bold tracking-tight">Cupo limitado a 20 participantes</span>
              <span className="text-sm text-on-surface-variant mt-1">Quedan <strong className="text-primary-container font-mono">{Math.max(0, 20 - players.length)}</strong> plazas disponibles.</span>
            </div>
          </div>
          {isRegistrationOpen ? (
            <form onSubmit={handleRegister} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs uppercase text-on-surface-variant">Nombre completo *</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">person</span>
                  <input required name="fullName" type="text" placeholder="Ej. Alex Rivera" className="w-full bg-surface-container-lowest text-on-surface pl-10 pr-4 py-2.5 rounded border border-outline-variant/30 focus:border-primary-container" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs uppercase text-on-surface-variant">Semestre *</label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">school</span>
                    <select required name="semester" defaultValue="" className="w-full bg-surface-container-lowest text-on-surface pl-10 pr-4 py-2.5 rounded border border-outline-variant/30 appearance-none">
                    <option value="" disabled>Selecciona tu grupo</option>
                    {['101', '102', '301', '302', '501', '502', '701', '702', '901'].map(n => (
                      <option key={n} value={n}>Grupo {n}</option>
                    ))}
                  </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs uppercase text-on-surface-variant">Cuenta UAEH *</label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">badge</span>
                    <input required name="accountNumber" type="text" pattern="\d+" placeholder="Ej. 321456" className="w-full bg-surface-container-lowest text-on-surface pl-10 pr-4 py-2.5 rounded border border-outline-variant/30" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs uppercase text-on-surface-variant">WhatsApp (10 Dígitos) *</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">chat</span>
                  <input required name="whatsapp" type="tel" pattern="\d{10}" maxLength={10} placeholder="Ej. 7731234567" className="w-full bg-surface-container-lowest text-on-surface pl-10 pr-4 py-2.5 rounded border border-outline-variant/30" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs uppercase text-on-surface-variant">Gamertag / ID *</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">videogame_asset</span>
                  <input required name="gamertag" type="text" placeholder="Ej. Shadow_ESTL #7821" className="w-full bg-surface-container-lowest text-on-surface font-mono pl-10 pr-4 py-2.5 rounded border border-outline-variant/30" />
                </div>
              </div>
              <button type="submit" className="mt-4 w-full py-3 rounded bg-primary-container text-background font-display text-lg uppercase font-bold">
                Inscribirme
              </button>
            </form>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-surface-container-lowest/50 rounded-lg">
              <span className="material-symbols-outlined text-3xl text-outline mb-4">lock</span>
              <h3 className="text-2xl font-bold text-on-surface uppercase tracking-tight mb-2">Inscripciones Cerradas</h3>
            </div>
          )}
        </div>
      </section>

      {/* CLASIFICACION */}
      <section id="clasificacion" className="w-full px-4 md:px-10 py-16 flex flex-col items-center">
        {areGamesRevealed ? (
          <>
            <h2 className="text-3xl md:text-4xl font-display uppercase tracking-tight text-on-surface mb-8 text-center">Tabla de Clasificación</h2>
            {/* PODIO TOP 3 */}
            {top3.length >= 3 && (
              <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="order-2 md:order-1 bg-surface-container-low p-6 rounded-xl flex flex-col items-center text-center shadow-lg transform md:translate-y-4 border border-outline-variant/30 transition-all">
                  <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface mb-2 font-bold text-xl">#2</div>
                  <span className="text-xl font-bold text-on-surface">{top3[1].name}</span>
                  <span className="font-mono text-[10px] text-outline uppercase tracking-wider mt-1">Subcampeón</span>
                  <span className="text-3xl font-bold text-on-surface mt-2">{filterCategory === 'minecraft' ? top3[1].mc : filterCategory === 'clash' ? top3[1].cr : filterCategory === 'fifa' ? top3[1].fifa : top3[1].total} <span className="text-sm text-outline">PTS</span></span>
                </div>
                <div className="order-1 md:order-2 bg-surface-container p-6 rounded-xl flex flex-col items-center text-center shadow-[0_0_30px_rgba(255,215,0,0.25)] relative border border-secondary-fixed/40 hover:scale-[1.02] transition-transform">
                  <div className="absolute -top-3 px-4 py-1 rounded-full bg-secondary-fixed text-background font-mono text-[10px] font-bold uppercase tracking-widest shadow">Líder Absoluto</div>
                  <div className="w-14 h-14 rounded-full bg-secondary-fixed/20 text-secondary-fixed flex items-center justify-center mb-2 shadow-[0_0_16px_rgba(255,215,0,0.5)]">
                    <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                  </div>
                  <span className="text-2xl font-bold text-on-surface">{top3[0].name}</span>
                  <span className="font-mono text-xs text-secondary-fixed uppercase tracking-wider font-semibold mt-1">1° Lugar General</span>
                  <span className="text-5xl font-bold text-primary-fixed mt-2">{filterCategory === 'minecraft' ? top3[0].mc : filterCategory === 'clash' ? top3[0].cr : filterCategory === 'fifa' ? top3[0].fifa : top3[0].total} <span className="text-sm text-primary-container">PTS</span></span>
                </div>
                <div className="order-3 bg-surface-container-low p-6 rounded-xl flex flex-col items-center text-center shadow-lg transform md:translate-y-6 border border-outline-variant/30 transition-all">
                  <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface mb-2 font-bold text-xl">#3</div>
                  <span className="text-xl font-bold text-on-surface">{top3[2].name}</span>
                  <span className="font-mono text-[10px] text-outline uppercase tracking-wider mt-1">3er Lugar</span>
                  <span className="text-3xl font-bold text-on-surface mt-2">{filterCategory === 'minecraft' ? top3[2].mc : filterCategory === 'clash' ? top3[2].cr : filterCategory === 'fifa' ? top3[2].fifa : top3[2].total} <span className="text-sm text-outline">PTS</span></span>
                </div>
              </div>
            )}
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
                  {paginatedPlayers.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-outline">No se encontraron jugadores.</td></tr>
                  ) : (
                    paginatedPlayers.map((player, idx) => {
                      const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                      return (
                        <tr key={player.id} className="hover:bg-surface-container cursor-pointer">
                          <td className="py-3 px-4 text-center font-bold">{globalIdx}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-on-surface">{player.name}</div>
                            <div className="font-mono text-[10px] text-outline uppercase">{player.gamertag}</div>
                          </td>
                          <td className="py-3 px-4 text-right">{player.mc} pts</td>
                          <td className="py-3 px-4 text-right">{player.cr} pts</td>
                          <td className="py-3 px-4 text-right">{player.fifa} pts</td>
                          <td className="py-3 px-4 text-right font-bold text-lg text-primary-container">{player.total} pts</td>
                        </tr>
                      )
                    })
                  )}
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
          <div className="w-full max-w-3xl py-20 flex flex-col items-center justify-center text-center bg-surface-container-lowest/50 border border-outline-variant/30 rounded-2xl">
            <span className="material-symbols-outlined text-5xl text-outline mb-4">visibility_off</span>
            <h3 className="text-2xl font-bold text-on-surface uppercase tracking-tight mb-2">Clasificación Oculta</h3>
            <p className="text-on-surface-variant max-w-md">Para mantener la intriga del torneo, la tabla de posiciones se habilitará una vez que los juegos oficiales sean revelados.</p>
          </div>
        )}
      </section>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="bg-surface-container p-8 rounded-xl max-w-md w-full text-center border border-primary-container/40 shadow-[0_0_36px_rgba(0,240,255,0.4)]">
            <span className="material-symbols-outlined text-6xl text-primary-container mb-4">check_circle</span>
            <h3 className="text-2xl font-bold mb-2">¡Registro Exitoso!</h3>
            <button onClick={() => setShowSuccess(false)} className="mt-4 w-full py-3 bg-primary-container text-background font-bold uppercase rounded">Cerrar</button>
          </div>
        </div>
      )}
    </main>
  );
}