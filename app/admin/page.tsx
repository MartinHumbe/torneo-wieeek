'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const ITEMS_PER_PAGE = 7;

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const [registros, setRegistros] = useState<any[]>([]);
  const [inscripcionesAbiertas, setInscripcionesAbiertas] = useState(false);
  const [areGamesRevealed, setAreGamesRevealed] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [showGames, setShowGames] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      const { data: settingsData } = await supabase.from('settings').select('is_registration_open, are_games_revealed').eq('id', 1).single();
      if (settingsData) {
        setInscripcionesAbiertas(settingsData.is_registration_open);
        setAreGamesRevealed(settingsData.are_games_revealed);
      }

      const { data: playersData } = await supabase.from('players').select('*').order('total', { ascending: false });
      if (playersData) setRegistros(playersData);
    };

    fetchData();

    const playersSub = supabase.channel('admin-players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, async () => {
        const { data } = await supabase.from('players').select('*').order('total', { ascending: false });
        if (data) setRegistros(data);
      }).subscribe();

    return () => { supabase.removeChannel(playersSub); };
  }, [isAuthenticated]);

  const totalPages = Math.ceil(registros.length / ITEMS_PER_PAGE);
  const paginatedRegistros = registros.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'wieeek2026') setIsAuthenticated(true);
    else { alert('Contraseña incorrecta'); setPasswordInput(''); }
  };

  const toggleInscripciones = async () => {
    const newState = !inscripcionesAbiertas;
    setInscripcionesAbiertas(newState);
    const { error } = await supabase.from('settings').update({ is_registration_open: newState }).eq('id', 1);
    if (!error) showToast(`Inscripciones ${newState ? 'abiertas' : 'cerradas'}.`);
  };

  const toggleGamesReveal = async () => {
    const newState = !areGamesRevealed;
    setAreGamesRevealed(newState);
    const { error } = await supabase.from('settings').update({ are_games_revealed: newState }).eq('id', 1);
    if (!error) showToast(`Juegos ${newState ? 'Revelados' : 'Censurados'} en la página principal.`);
  };

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar a ${name}?`)) {
      await supabase.from('players').delete().eq('id', id);
      showToast(`Jugador ${name} eliminado.`);
      if (paginatedRegistros.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
    }
  };

  const handleUpdatePoints = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPlayer) return;
    const formData = new FormData(e.currentTarget);
    const mc = parseInt(formData.get('mc') as string) || 0;
    const cr = parseInt(formData.get('cr') as string) || 0;
    const fifa = parseInt(formData.get('fifa') as string) || 0;
    const total = mc + cr + fifa;
    const { error } = await supabase.from('players').update({ mc, cr, fifa, total }).eq('id', editingPlayer.id);
    if (!error) {
      showToast(`Puntos actualizados para ${editingPlayer.name}.`);
      setEditingPlayer(null); 
    }
  };

  const exportarCSV = () => {
    const cabeceras = ['ID,Nombre,Semestre,Cuenta UAEH,WhatsApp,Gamertag,Puntos MC,Puntos CR,Puntos FIFA,Total\n'];
    const filas = registros.map(r => 
      `${r.id},"${r.name}",${r.semester},${r.account},${r.whatsapp},"${r.gamertag}",${r.mc},${r.cr},${r.fifa},${r.total}\n`
    );
    const csvContent = new Blob([...cabeceras, ...filas], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(csvContent);
    link.setAttribute('download', 'wieeek_registros_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Archivo CSV exportado correctamente.");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <form onSubmit={handleLogin} className="bg-surface-container/80 backdrop-blur-xl border border-outline-variant/30 p-8 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] w-full max-w-sm flex flex-col gap-6 relative z-10">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-primary-container mb-2">admin_panel_settings</span>
            <h2 className="text-2xl font-display font-bold text-on-surface uppercase tracking-tight">Acceso Admin</h2>
          </div>
          <input type="password" placeholder="Contraseña" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full bg-surface-container-lowest text-on-surface px-4 py-3 rounded border border-outline-variant/30 text-center tracking-[0.2em] focus:border-primary-container focus:outline-none" />
          <button type="submit" className="w-full py-3 bg-primary-container text-background font-bold uppercase rounded hover:brightness-110">Ingresar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-10 bg-background text-on-surface relative pb-28 sm:pb-10">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER DE PC (Se oculta en celulares) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 border-b border-surface-container-highest pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary-container uppercase tracking-tight">Panel de Control</h1>
          </div>
          <div className="hidden sm:flex flex-wrap items-center gap-3">
            <button onClick={() => setShowGames(!showGames)} className="flex items-center gap-2 bg-surface-container text-on-surface px-4 py-2 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all border border-outline-variant/30 hover:bg-surface-container-high">
              <span className="material-symbols-outlined text-sm">{showGames ? 'visibility_off' : 'visibility'}</span>
              {showGames ? 'Ocultar Columnas' : 'Mostrar Columnas'}
            </button>
            <button onClick={toggleGamesReveal} className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all border ${areGamesRevealed ? 'bg-surface-container text-on-surface border-outline-variant/30 hover:bg-surface-container-high' : 'bg-primary-container/10 text-primary-container border-primary-container/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]'}`}>
              <span className="material-symbols-outlined text-sm">{areGamesRevealed ? 'visibility' : 'visibility_off'}</span>
              {areGamesRevealed ? 'Censurar Juegos' : 'Juegos Revelados'}
            </button>
            <button onClick={toggleInscripciones} className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all border ${inscripcionesAbiertas ? 'bg-primary-container/10 text-primary-container border-primary-container/50' : 'bg-red-500/10 text-red-400 border-red-500/50'}`}>
              <span className="material-symbols-outlined text-sm">{inscripcionesAbiertas ? 'lock_open' : 'lock'}</span>
              {inscripcionesAbiertas ? 'Cerrar Registro' : 'Abrir Registro'}
            </button>
            <button onClick={exportarCSV} className="flex items-center gap-2 bg-tertiary-container text-background px-4 py-2 rounded font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-[0_0_15px_rgba(51,251,10,0.3)] transition-all">
              <span className="material-symbols-outlined text-sm">download</span> Exportar
            </button>
          </div>
        </div>

        {/* INDICADOR MÓVIL PARA EDITAR PUNTOS */}
        <div className="sm:hidden mb-4 flex justify-center">
          <div className="bg-primary-container/10 border border-primary-container/30 px-4 py-2 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
            <span className="material-symbols-outlined text-primary-container text-sm animate-bounce">touch_app</span>
            <span className="font-mono text-[10px] text-primary-container uppercase tracking-wider font-bold">Toca a un jugador para editar</span>
          </div>
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-high/60 text-on-surface-variant font-mono text-[10px] uppercase tracking-wider border-b border-surface-container-highest">
                  <th className="p-4 sticky left-0 bg-surface-container-high/90 backdrop-blur-md z-10 shadow-[4px_0_10px_rgba(0,0,0,0.1)]">Jugador / Contacto</th>
                  {showGames && (
                    <>
                      <th className="p-4 text-center text-tertiary-fixed">Minecraft</th>
                      <th className="p-4 text-center text-secondary-fixed">Clash Royale</th>
                      <th className="p-4 text-center text-primary-fixed">FIFA</th>
                    </>
                  )}
                  <th className="p-4 text-center text-primary-container">Total</th>
                  {/* COLUMNA PEGAJOSA PARA ACCIONES */}
                  <th className="p-4 text-center sticky right-0 bg-surface-container-highest shadow-[-4px_0_10px_rgba(0,0,0,0.1)] z-10">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {paginatedRegistros.length === 0 ? (
                  <tr><td colSpan={showGames ? 6 : 3} className="p-8 text-center text-outline font-mono text-sm uppercase">Sin registros en esta vista.</td></tr>
                ) : (
                  paginatedRegistros.map((jugador) => (
                    <tr 
                      key={jugador.id} 
                      onClick={() => setEditingPlayer(jugador)} 
                      className="hover:bg-surface-container/50 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 sticky left-0 bg-surface-container-lowest group-hover:bg-surface-container/50 transition-colors z-10 shadow-[4px_0_10px_rgba(0,0,0,0.1)]">
                        <div className="font-bold text-on-surface">{jugador.name}</div>
                        <div className="font-mono text-[10px] text-outline mt-1">WA: {jugador.whatsapp} • ID: {jugador.gamertag}</div>
                      </td>
                      {showGames && (
                        <>
                          <td className="p-4 text-center font-bold text-tertiary-fixed">{jugador.mc}</td>
                          <td className="p-4 text-center font-bold text-secondary-fixed">{jugador.cr}</td>
                          <td className="p-4 text-center font-bold text-primary-fixed">{jugador.fifa}</td>
                        </>
                      )}
                      <td className="p-4 text-center font-bold text-primary-container text-lg">{jugador.total}</td>
                      <td className="p-4 text-center sticky right-0 bg-surface-container-lowest border-l border-outline-variant/20 group-hover:bg-surface-container/50 transition-colors z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setEditingPlayer(jugador); }} className="p-2 sm:p-1.5 rounded bg-surface-container hover:text-primary-container transition-colors shadow-md">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(jugador.id, jugador.name); }} className="p-2 sm:p-1.5 rounded bg-surface-container text-red-400 hover:bg-red-400/10 transition-colors shadow-md">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-surface-container-high/40 border-t border-surface-container flex justify-between items-center">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-surface-container text-on-surface font-mono text-xs uppercase rounded disabled:opacity-50">Anterior</button>
              <span className="font-mono text-[10px] text-outline tracking-wider hidden sm:block">Página {currentPage} de {totalPages}</span>
              <span className="font-mono text-[10px] text-outline tracking-wider sm:hidden">{currentPage}/{totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-surface-container text-on-surface font-mono text-xs uppercase rounded disabled:opacity-50">Siguiente</button>
            </div>
          )}
        </div>
      </div>

      {/* BARRA DE NAVEGACIÓN INFERIOR (Solo visible en Celular) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-surface-container-high/95 backdrop-blur-xl border-t border-outline-variant/30 z-40 flex justify-around items-center p-2 pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <button onClick={() => setShowGames(!showGames)} className={`flex flex-col items-center gap-1 w-16 p-2 rounded-lg transition-colors ${showGames ? 'text-on-surface' : 'text-primary-container bg-primary-container/10'}`}>
          <span className="material-symbols-outlined text-[22px]">{showGames ? 'visibility_off' : 'visibility'}</span>
          <span className="font-mono text-[9px] uppercase tracking-wider mt-1">{showGames ? 'Columnas' : 'Columnas'}</span>
        </button>

        <button onClick={toggleGamesReveal} className={`flex flex-col items-center gap-1 w-16 p-2 rounded-lg transition-colors ${areGamesRevealed ? 'text-on-surface' : 'text-secondary-fixed bg-secondary-fixed/10'}`}>
          <span className="material-symbols-outlined text-[22px]">{areGamesRevealed ? 'public' : 'public_off'}</span>
          <span className="font-mono text-[9px] uppercase tracking-wider mt-1">{areGamesRevealed ? 'Público' : 'Secreto'}</span>
        </button>

        <button onClick={toggleInscripciones} className={`flex flex-col items-center gap-1 w-16 p-2 rounded-lg transition-colors ${inscripcionesAbiertas ? 'text-tertiary-fixed bg-tertiary-fixed/10' : 'text-red-400'}`}>
          <span className="material-symbols-outlined text-[22px]">{inscripcionesAbiertas ? 'lock_open' : 'lock'}</span>
          <span className="font-mono text-[9px] uppercase tracking-wider mt-1">{inscripcionesAbiertas ? 'Abierto' : 'Cerrado'}</span>
        </button>

        <button onClick={exportarCSV} className="flex flex-col items-center gap-1 w-16 p-2 rounded-lg text-on-surface hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-[22px]">download</span>
          <span className="font-mono text-[9px] uppercase tracking-wider mt-1">Exportar</span>
        </button>
      </nav>

      {/* MODAL DE EDICIÓN */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-surface-container p-6 rounded-xl max-w-sm w-full relative shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-outline-variant/30">
            <button onClick={() => setEditingPlayer(null)} className="absolute top-4 right-4 text-outline hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
            <h3 className="text-xl font-bold mb-1 text-on-surface uppercase tracking-tight">Editar Puntos</h3>
            <span className="font-mono text-[10px] text-primary-container uppercase tracking-wider block mb-5">{editingPlayer.name}</span>
            <form onSubmit={handleUpdatePoints} className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs uppercase text-tertiary-fixed">Minecraft</label>
                <input type="number" name="mc" defaultValue={editingPlayer.mc} className="w-24 p-2 bg-surface-container-lowest border border-outline-variant/30 rounded text-on-surface text-right focus:border-tertiary-fixed focus:outline-none" />
              </div>
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs uppercase text-secondary-fixed">Clash Royale</label>
                <input type="number" name="cr" defaultValue={editingPlayer.cr} className="w-24 p-2 bg-surface-container-lowest border border-outline-variant/30 rounded text-on-surface text-right focus:border-secondary-fixed focus:outline-none" />
              </div>
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs uppercase text-primary-fixed">FIFA</label>
                <input type="number" name="fifa" defaultValue={editingPlayer.fifa} className="w-24 p-2 bg-surface-container-lowest border border-outline-variant/30 rounded text-on-surface text-right focus:border-primary-fixed focus:outline-none" />
              </div>
              <button type="submit" className="w-full py-3 mt-2 bg-primary-container text-background font-bold uppercase tracking-wider rounded shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:brightness-110">Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      {toastMessage && (
        <div className="fixed bottom-24 sm:bottom-10 right-4 sm:right-10 z-50 flex items-center gap-3 bg-surface-container-high border border-primary-container/50 text-on-surface px-6 py-4 rounded-lg shadow-[0_0_30px_rgba(0,240,255,0.25)] transition-all">
          <span className="material-symbols-outlined text-primary-container">check_circle</span>
          <span className="font-mono text-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}