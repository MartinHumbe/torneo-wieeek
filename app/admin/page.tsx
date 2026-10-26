'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // <-- Ajusta esta ruta si es diferente en tu proyecto
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminPage() {
  // ================= ESTADOS =================
  // Vista 1: Jugadores
  const [registros, setRegistros] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Vista 2: Llaves
  const [adminView, setAdminView] = useState<'jugadores' | 'llaves'>('jugadores');
  const [matches, setMatches] = useState<any[]>([]);
  const [adminFiltroJuego, setAdminFiltroJuego] = useState('fc27');
  const [adminFiltroGrupo, setAdminFiltroGrupo] = useState('A');

  // ================= EFECTOS =================
  useEffect(() => {
    fetchRegistros();
    fetchMatches();
  }, []);

  const showToast = (mensaje: string) => {
    alert(mensaje); // Puedes cambiar esto por tu componente Toast personalizado si tienes uno
  };

  // ================= FUNCIONES VISTA 1: JUGADORES =================
  const fetchRegistros = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('players').select('*').order('total', { ascending: false });
    if (data) setRegistros(data);
    setLoading(false);
  };

  const handleUpdatePoints = async (id: string, field: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const { data: player } = await supabase.from('players').select('*').eq('id', id).single();
    if (!player) return;

    const newPlayer = { ...player, [field]: numValue };
    newPlayer.total = newPlayer.minecraft + newPlayer.clash + newPlayer.fifa;

    await supabase.from('players').update({
      [field]: numValue,
      total: newPlayer.total
    }).eq('id', id);
    
    fetchRegistros();
    showToast(`✅ Puntos de ${field} actualizados`);
  };

  const handleUpdateGrupo = async (id: string, grupo: string) => {
    await supabase.from('players').update({ grupo }).eq('id', id);
    fetchRegistros();
    showToast(`✅ Grupo actualizado`);
  };

  const handleDeletePlayer = async (id: string) => {
    if (!window.confirm('🚨 ¿Estás seguro de eliminar a este jugador?')) return;
    await supabase.from('players').delete().eq('id', id);
    fetchRegistros();
    showToast('🗑️ Jugador eliminado');
  };

  const handleSorteoGrupos = async () => {
    if (!window.confirm('🚨 ¿Estás seguro de realizar el sorteo? Esto asignará aleatoriamente a los 30 jugadores (10 por grupo) y sobrescribirá cualquier grupo actual.')) return;
    setIsDrawing(true);
    try {
      let bolsaGrupos = [...Array(10).fill('A'), ...Array(10).fill('B'), ...Array(10).fill('C')];
      for (let i = bolsaGrupos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bolsaGrupos[i], bolsaGrupos[j]] = [bolsaGrupos[j], bolsaGrupos[i]];
      }
      const updates = registros.map((player, index) => {
        return supabase.from('players').update({ grupo: bolsaGrupos[index] || '-' }).eq('id', player.id);
      });
      await Promise.all(updates);
      showToast('🎲 ¡Sorteo completado! Los grupos han sido asignados aleatoriamente.');
      fetchRegistros();
    } catch (error) {
      showToast('❌ Hubo un error al realizar el sorteo.');
    } finally {
      setIsDrawing(false);
    }
  };

  // ================= FUNCIONES VISTA 2: LLAVES =================
  const fetchMatches = async () => {
    const { data } = await supabase.from('matches').select('*').order('orden', { ascending: true });
    if (data) setMatches(data);
  };

  const handleCrearReta = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const match = {
      juego: formData.get('juego'),
      grupo: formData.get('grupo'),
      ronda: formData.get('ronda'),
      jugador1: formData.get('jugador1'),
      jugador2: formData.get('jugador2'),
      estado: 'pendiente',
      orden: matches.length + 1
    };
    await supabase.from('matches').insert([match]);
    showToast('⚔️ Enfrentamiento enviado a la Arena');
    fetchMatches();
  };

  const handleGenerarBracket = async (juego: string, grupo: string) => {
    if (!window.confirm(`🎲 ¿Sortear bracket automático para ${juego.toUpperCase()} - Grupo ${grupo}? Se sobrescribirán las llaves actuales.`)) return;

    const { data: players } = await supabase.from('players').select('name').eq('grupo', grupo);
    if (!players || players.length === 0) return showToast('❌ No hay jugadores en ese grupo');

    let P = players.map(p => p.name);
    for (let i = P.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [P[i], P[j]] = [P[j], P[i]];
    }
    while(P.length < 10) P.push('BYE (Pase directo)');

    const nuevasRetas = [
      { juego, grupo, ronda: 'Previa 1', jugador1: P[0], jugador2: P[1], estado: 'pendiente', orden: 1 },
      { juego, grupo, ronda: 'Previa 2', jugador1: P[2], jugador2: P[3], estado: 'pendiente', orden: 2 },
      { juego, grupo, ronda: 'Cuartos 1', jugador1: 'Ganador Previa 1', jugador2: P[4], estado: 'pendiente', orden: 3 },
      { juego, grupo, ronda: 'Cuartos 2', jugador1: 'Ganador Previa 2', jugador2: P[5], estado: 'pendiente', orden: 4 },
      { juego, grupo, ronda: 'Cuartos 3', jugador1: P[6], jugador2: P[7], estado: 'pendiente', orden: 5 },
      { juego, grupo, ronda: 'Cuartos 4', jugador1: P[8], jugador2: P[9], estado: 'pendiente', orden: 6 },
      { juego, grupo, ronda: 'Semifinal 1', jugador1: 'Ganador Cuartos 1', jugador2: 'Ganador Cuartos 2', estado: 'pendiente', orden: 7 },
      { juego, grupo, ronda: 'Semifinal 2', jugador1: 'Ganador Cuartos 3', jugador2: 'Ganador Cuartos 4', estado: 'pendiente', orden: 8 },
      { juego, grupo, ronda: 'Final', jugador1: 'Ganador Semi 1', jugador2: 'Ganador Semi 2', estado: 'pendiente', orden: 9 }
    ];

    await supabase.from('matches').delete().eq('juego', juego).eq('grupo', grupo);
    await supabase.from('matches').insert(nuevasRetas);
    showToast('🏆 Bracket generado con éxito');
    fetchMatches();
  };

  const handleLimpiarLlaves = async (juego: string, grupo: string) => {
    if (!window.confirm(`⚠️ ¿ESTÁS SEGURO? Esto borrará todas las retas y marcadores de ${juego.toUpperCase()} - Grupo ${grupo}.`)) return;
    await supabase.from('matches').delete().eq('juego', juego).eq('grupo', grupo);
    showToast(`🗑️ Llaves del Grupo ${grupo} eliminadas`);
    fetchMatches();
  };

  const handleActualizarMarcador = async (id: string, j1: string, j2: string, marcador1: number, marcador2: number, estado: string) => {
    let ganador = 'TBD';
    if (estado === 'terminado') {
      ganador = marcador1 > marcador2 ? 'jugador1' : (marcador2 > marcador1 ? 'jugador2' : 'Empate');
    }
    await supabase.from('matches').update({ jugador1: j1, jugador2: j2, marcador1, marcador2, estado, ganador }).eq('id', id);
    showToast('✅ Partida actualizada');
    fetchMatches();
  };

  // Filtro de búsqueda
  const filteredRegistros = registros.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.gamertag && p.gamertag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* HEADER */}
      <header className="bg-surface-container border-b border-outline-variant/30 py-6 px-4 md:px-12 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center text-background font-black text-2xl rotate-3 shadow-[0_0_20px_rgba(0,240,255,0.4)]">W</div>
            <div>
              <h1 className="text-2xl font-display font-black text-on-surface uppercase tracking-tight">Panel de Control</h1>
              <p className="text-primary-fixed font-mono text-xs uppercase tracking-widest">Administración WIEEEK</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 mt-4">
        
        {/* PESTAÑAS DE NAVEGACIÓN ADMIN */}
        <div className="flex bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/30 mb-8 w-fit mx-auto shadow-lg">
          <button 
            onClick={() => setAdminView('jugadores')} 
            className={`px-6 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition-all ${adminView === 'jugadores' ? 'bg-primary-fixed text-background shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined text-[14px] align-middle mr-2">group</span> Jugadores y Puntos
          </button>
          <button 
            onClick={() => setAdminView('llaves')} 
            className={`px-6 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition-all ${adminView === 'llaves' ? 'bg-secondary-fixed text-background shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined text-[14px] align-middle mr-2">sports_esports</span> Gestor de Llaves
          </button>
        </div>

        {/* ================= VISTA 1: JUGADORES ================= */}
        <div className={adminView === 'jugadores' ? 'block' : 'hidden'}>
          
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input 
                type="text" 
                placeholder="Buscar por nombre o gamertag..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface pl-10 pr-4 py-3 rounded-lg border border-outline-variant/30 focus:border-primary-container focus:outline-none transition-colors shadow-sm"
              />
            </div>
            <button 
              onClick={handleSorteoGrupos}
              disabled={isDrawing}
              className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 bg-secondary-fixed text-background font-mono text-sm uppercase tracking-wider font-bold rounded-lg shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">casino</span>
              {isDrawing ? 'Sorteando...' : 'Sortear Grupos (A, B, C)'}
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden shadow-lg mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-surface-container border-b border-outline-variant/30 font-mono text-xs uppercase tracking-wider text-outline">
                  <tr>
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4">Jugador / Gamertag</th>
                    <th className="p-4 text-center">Grupo</th>
                    <th className="p-4 text-center text-tertiary-fixed">Minecraft</th>
                    <th className="p-4 text-center text-secondary-fixed">Clash Royale</th>
                    <th className="p-4 text-center text-primary-fixed">FC 27</th>
                    <th className="p-4 text-center">Total</th>
                    <th className="p-4 text-center">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-on-surface text-sm">
                  {loading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-outline">Cargando jugadores...</td></tr>
                  ) : filteredRegistros.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-outline">No hay jugadores registrados.</td></tr>
                  ) : (
                    filteredRegistros.map((player, idx) => (
                      <tr key={player.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="p-4 text-center text-outline font-mono">{idx + 1}</td>
                        <td className="p-4">
                          <div className="font-bold">{player.name}</div>
                          <div className="text-xs text-outline-variant font-mono">{player.gamertag || 'Sin Gamertag'}</div>
                        </td>
                        <td className="p-4 text-center">
                          <select 
                            defaultValue={player.grupo || '-'}
                            onChange={(e) => handleUpdateGrupo(player.id, e.target.value)}
                            className="bg-surface-container border border-outline-variant/30 rounded p-1.5 font-mono text-xs outline-none focus:border-primary-fixed"
                          >
                            <option value="-">-</option>
                            <option value="A">Grupo A</option>
                            <option value="B">Grupo B</option>
                            <option value="C">Grupo C</option>
                          </select>
                        </td>
                        <td className="p-4 text-center">
                          <input type="number" defaultValue={player.minecraft} onBlur={(e) => handleUpdatePoints(player.id, 'minecraft', e.target.value)} className="w-16 p-1.5 bg-surface-container text-center rounded border border-outline-variant/30 focus:border-tertiary-fixed outline-none" />
                        </td>
                        <td className="p-4 text-center">
                          <input type="number" defaultValue={player.clash} onBlur={(e) => handleUpdatePoints(player.id, 'clash', e.target.value)} className="w-16 p-1.5 bg-surface-container text-center rounded border border-outline-variant/30 focus:border-secondary-fixed outline-none" />
                        </td>
                        <td className="p-4 text-center">
                          <input type="number" defaultValue={player.fifa} onBlur={(e) => handleUpdatePoints(player.id, 'fifa', e.target.value)} className="w-16 p-1.5 bg-surface-container text-center rounded border border-outline-variant/30 focus:border-primary-fixed outline-none" />
                        </td>
                        <td className="p-4 text-center font-bold text-primary-container text-base">{player.total}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleDeletePlayer(player.id)} className="p-2 text-error hover:bg-error/20 rounded transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ================= VISTA 2: GESTOR DE LLAVES ================= */}
        <div className={adminView === 'llaves' ? 'block' : 'hidden'}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface-container p-6 rounded-xl border border-secondary-fixed/50 shadow-[0_0_15px_rgba(255,215,0,0.1)]">
              <h2 className="text-lg font-display font-bold mb-4 text-secondary-fixed flex items-center gap-2">
                <span className="material-symbols-outlined">casino</span> Sortear Bracket Completo
              </h2>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <select id="sorteo-juego" className="p-3 flex-1 rounded bg-surface-container-lowest text-on-surface border border-outline-variant/30 font-bold outline-none">
                    <option value="fc27">FC 27</option>
                    <option value="clash">Clash Royale</option>
                  </select>
                  <select id="sorteo-grupo" className="p-3 w-32 rounded bg-surface-container-lowest text-on-surface border border-outline-variant/30 font-bold outline-none">
                    <option value="A">Grupo A</option><option value="B">Grupo B</option><option value="C">Grupo C</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => handleGenerarBracket((document.getElementById('sorteo-juego') as HTMLSelectElement).value, (document.getElementById('sorteo-grupo') as HTMLSelectElement).value)}
                    className="py-3 px-4 flex-1 bg-secondary-fixed text-background font-bold rounded hover:bg-secondary-fixed/90 transition-all uppercase tracking-widest text-xs"
                  >
                    Generar / Regenerar
                  </button>
                  <button 
                    onClick={() => handleLimpiarLlaves((document.getElementById('sorteo-juego') as HTMLSelectElement).value, (document.getElementById('sorteo-grupo') as HTMLSelectElement).value)}
                    className="py-3 px-4 bg-error text-background font-bold rounded hover:bg-error/90 transition-all uppercase tracking-widest text-xs flex items-center gap-1"
                    title="Borrar todas las llaves de este grupo"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_sweep</span> Limpiar
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/30 shadow-lg">
              <h2 className="text-lg font-display font-bold mb-4 text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined">add</span> Agregar Reta Manual
              </h2>
              <form onSubmit={handleCrearReta} className="flex gap-3">
                <input name="jugador1" placeholder="Jugador 1" className="p-3 w-full rounded bg-surface-container-lowest text-on-surface border border-outline-variant/30 font-bold" required />
                <span className="flex items-center justify-center font-black text-outline-variant italic">vs</span>
                <input name="jugador2" placeholder="Jugador 2" className="p-3 w-full rounded bg-surface-container-lowest text-on-surface border border-outline-variant/30 font-bold" required />
                <input type="hidden" name="juego" value={adminFiltroJuego} /><input type="hidden" name="grupo" value={adminFiltroGrupo} /><input type="hidden" name="ronda" value="Exhibición" />
                <button type="submit" className="py-3 px-4 bg-surface-container-highest text-on-surface border border-outline-variant font-bold rounded hover:bg-on-surface hover:text-background transition-colors"><span className="material-symbols-outlined align-middle">send</span></button>
              </form>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-6 bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30">
            <span className="text-sm font-mono font-bold text-outline uppercase self-center mr-2">Viendo Llaves de:</span>
            <select value={adminFiltroJuego} onChange={e => setAdminFiltroJuego(e.target.value)} className="p-2 rounded bg-surface-container text-on-surface border border-outline-variant/30 font-bold outline-none text-sm">
              <option value="fc27">FC 27</option>
              <option value="clash">Clash Royale</option>
            </select>
            <select value={adminFiltroGrupo} onChange={e => setAdminFiltroGrupo(e.target.value)} className="p-2 rounded bg-surface-container text-on-surface border border-outline-variant/30 font-bold outline-none text-sm">
              <option value="A">Grupo A</option><option value="B">Grupo B</option><option value="C">Grupo C</option>
            </select>
          </div>

          <div className="space-y-4">
            {matches
              .filter(m => m.juego === adminFiltroJuego && m.grupo === adminFiltroGrupo)
              .map(m => (
              <div key={m.id} className={`p-3 md:p-4 rounded-xl border flex flex-col xl:flex-row justify-between items-center gap-4 transition-all ${m.estado === 'jugando' ? 'bg-primary-fixed/10 border-primary-fixed shadow-[0_0_20px_rgba(0,240,255,0.15)]' : m.estado === 'terminado' ? 'bg-surface-container-lowest border-outline-variant/20 opacity-60' : 'bg-surface-container-low border-outline-variant/30'}`}>
                
                <div className="flex flex-col text-center xl:text-left w-full xl:w-auto">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-outline mb-2">{m.ronda}</span>
                  <div className="flex flex-col sm:flex-row items-center justify-center xl:justify-start gap-2">
                    <input id={`j1-${m.id}`} defaultValue={m.jugador1} className={`p-2 bg-background border ${m.ganador === 'jugador1' ? 'border-secondary-fixed text-secondary-fixed shadow-[0_0_10px_rgba(255,215,0,0.2)]' : 'border-outline-variant/30 text-on-surface'} rounded font-bold w-48 text-center sm:text-right`} />
                    <span className="text-outline-variant text-sm italic font-bold">VS</span> 
                    <input id={`j2-${m.id}`} defaultValue={m.jugador2} className={`p-2 bg-background border ${m.ganador === 'jugador2' ? 'border-secondary-fixed text-secondary-fixed shadow-[0_0_10px_rgba(255,215,0,0.2)]' : 'border-outline-variant/30 text-on-surface'} rounded font-bold w-48 text-center sm:text-left`} />
                  </div>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 bg-surface-container p-2 rounded-lg border border-outline-variant/20 w-full xl:w-auto">
                  <div className="flex items-center gap-2">
                    <input type="number" defaultValue={m.marcador1} id={`m1-${m.id}`} className="w-12 sm:w-14 p-2 text-center rounded bg-background font-bold text-lg sm:text-xl" />
                    <span className="font-bold text-outline">-</span>
                    <input type="number" defaultValue={m.marcador2} id={`m2-${m.id}`} className="w-12 sm:w-14 p-2 text-center rounded bg-background font-bold text-lg sm:text-xl" />
                  </div>
                  
                  <select id={`est-${m.id}`} defaultValue={m.estado} className="p-2 rounded bg-background text-xs sm:text-sm font-bold font-mono uppercase">
                    <option value="pendiente">Pendiente</option>
                    <option value="jugando">🔴 En Vivo</option>
                    <option value="terminado">Terminado</option>
                  </select>

                  <button 
                    onClick={() => {
                       const j1 = (document.getElementById(`j1-${m.id}`) as HTMLInputElement).value;
                       const j2 = (document.getElementById(`j2-${m.id}`) as HTMLInputElement).value;
                       const m1 = parseInt((document.getElementById(`m1-${m.id}`) as HTMLInputElement).value) || 0;
                       const m2 = parseInt((document.getElementById(`m2-${m.id}`) as HTMLInputElement).value) || 0;
                       const est = (document.getElementById(`est-${m.id}`) as HTMLSelectElement).value;
                       handleActualizarMarcador(m.id, j1, j2, m1, m2, est);
                    }} 
                    className="px-3 py-2 bg-surface-container-highest text-on-surface hover:bg-primary-fixed hover:text-background font-bold rounded transition-colors text-xs sm:text-sm"
                  >
                    Guardar
                  </button>
                  <button onClick={async () => {
                    if(window.confirm('¿Borrar esta reta?')) {
                      await supabase.from('matches').delete().eq('id', m.id);
                      showToast('🗑️ Partida eliminada');
                      fetchMatches();
                    }
                  }} className="px-2 py-2 text-error hover:bg-error hover:text-background rounded transition-colors">
                    <span className="material-symbols-outlined text-[18px] align-middle">delete</span>
                  </button>
                </div>

              </div>
            ))}
            
            {matches.filter(m => m.juego === adminFiltroJuego && m.grupo === adminFiltroGrupo).length === 0 && (
              <div className="text-center text-outline py-12 font-mono flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">account_tree</span>
                <p>No hay llaves generadas para el Grupo {adminFiltroGrupo}.</p>
                <p className="text-xs mt-1">Usa el panel superior para sortear el bracket.</p>
              </div>
            )}
          </div>

        </div>

      </main>
      
      {/* BARRA DE NAVEGACIÓN INFERIOR (MÓVIL) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-surface-container-high/90 backdrop-blur-md border-t border-outline-variant/30 flex justify-around p-3 z-50">
         <button onClick={() => setAdminView('jugadores')} className={`flex flex-col items-center gap-1 ${adminView === 'jugadores' ? 'text-primary-fixed' : 'text-on-surface-variant'}`}>
           <span className="material-symbols-outlined text-[22px]">group</span>
           <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Jugadores</span>
         </button>
         <button onClick={() => setAdminView('llaves')} className={`flex flex-col items-center gap-1 ${adminView === 'llaves' ? 'text-secondary-fixed' : 'text-on-surface-variant'}`}>
           <span className="material-symbols-outlined text-[22px]">sports_esports</span>
           <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Llaves</span>
         </button>
      </nav>
      
    </div>
  );
}