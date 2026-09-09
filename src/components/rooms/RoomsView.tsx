import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock,
  LayoutGrid,
  Table,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DoorClosed
} from 'lucide-react';
import { Room, Exam, Teacher, Language } from '../../types';
import { translations } from '../../services/i18n';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';

export type RoomSortField = 'nom' | 'batiment' | 'type' | 'capacite';

interface RoomsViewProps {
  rooms: Room[];
  exams: Exam[];
  teachers: Teacher[];
  language: Language;
  onAddRoom: () => void;
  onEditRoom: (room: Room) => void;
  onDeleteRoom: (roomId: string) => void;
  onOpenRoomAssignment?: (options?: { roomId?: string }) => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({
  rooms,
  exams,
  teachers,
  language,
  onAddRoom,
  onEditRoom,
  onDeleteRoom,
  onOpenRoomAssignment
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<RoomSortField>('nom');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // For Matrix view: select date
  const uniqueDates = Array.from(new Set(exams.map(e => e.date))).sort();
  const [selectedMatrixDate, setSelectedMatrixDate] = useState<string>(uniqueDates[0] || '');

  // Filtered & Sorted rooms
  const filteredRooms = useMemo(() => {
    const list = rooms.filter(room => {
      const matchesSearch = 
        room.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.batiment.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'ALL' || room.type === selectedType;
      return matchesSearch && matchesType;
    });

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'nom':
          comparison = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
          break;
        case 'batiment':
          comparison = a.batiment.localeCompare(b.batiment, 'fr', { sensitivity: 'base' });
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type, 'fr', { sensitivity: 'base' });
          break;
        case 'capacite':
          comparison = a.capacite - b.capacite;
          break;
        default:
          comparison = a.nom.localeCompare(b.nom);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [rooms, searchQuery, selectedType, sortField, sortDirection]);

  const totalCapacity = rooms.reduce((acc, r) => acc + r.capacite, 0);
  const totalAmphis = rooms.filter(r => r.type === 'Amphithéâtre').length;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Planning & Gestion des Salles d'Examens
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {rooms.length} locaux enregistrés • Capacité globale : {totalCapacity} places assises ({totalAmphis} amphis)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'cards' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Locaux</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'matrix' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Grille d'occupation</span>
            </button>
          </div>

          {onOpenRoomAssignment && (
            <button
              onClick={() => onOpenRoomAssignment()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
              title="Affecter une ou plusieurs salles à une ou plusieurs promotions avec contrôle automatique de capacité"
            >
              <DoorClosed className="w-4 h-4" />
              <span>Attribuer une salle</span>
            </button>
          )}

          <button
            onClick={onAddRoom}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter Salle / Amphi</span>
          </button>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <>
          {/* Search & Filter Bar with A-Z Sorting */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une salle, un bâtiment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
              />
            </div>

            <div className="sm:w-56">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              >
                <option value="ALL">Tous les types de locaux</option>
                <option value="Amphithéâtre">Amphithéâtres</option>
                <option value="Salle TD">Salles TD</option>
                <option value="Salle TP">Salles TP</option>
                <option value="Laboratoire">Laboratoires</option>
              </select>
            </div>

            {/* Quick A-Z / Z-A Sorting Button */}
            <button
              type="button"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-indigo-700 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 rtl:space-x-reverse border border-slate-200 shadow-2xs transition"
              title={sortDirection === 'asc' ? 'Classé de A à Z (Cliquer pour inverser Z à A)' : 'Classé de Z à A (Cliquer pour inverser A à Z)'}
            >
              <ArrowUpDown className="w-4 h-4 text-indigo-600" />
              <span>{sortDirection === 'asc' ? 'A → Z' : 'Z → A'}</span>
            </button>

            {/* Sort criteria */}
            <div className="sm:w-48">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as RoomSortField)}
                className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                title="Critère de tri"
              >
                <option value="nom">Trier par : Nom de salle</option>
                <option value="batiment">Trier par : Bâtiment</option>
                <option value="type">Trier par : Type de local</option>
                <option value="capacite">Trier par : Capacité</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => {
              // Count exams using this room
              const roomExams = exams.filter(e => e.salles.some(s => s.roomId === room.id));

              return (
                <div
                  key={room.id}
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                          {room.nom}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {room.batiment}
                        </p>
                      </div>

                      <Badge
                        variant={room.type === 'Amphithéâtre' ? 'indigo' : 'default'}
                        size="sm"
                      >
                        {room.type}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-center gap-4 py-2 border-y border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Capacité</span>
                        <span className="font-bold text-slate-800 text-sm font-mono">{room.capacite} places</span>
                      </div>
                      <div className="pl-4 border-l border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sessions prévues</span>
                        <span className="font-bold text-indigo-700 text-sm">{roomExams.length} épreuves</span>
                      </div>
                    </div>

                    {/* Equipments list */}
                    {room.equipements && room.equipements.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {room.equipements.map((eq, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
                          >
                            {eq}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card actions footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Disponible
                    </span>

                    <div className="flex items-center gap-1">
                      {onOpenRoomAssignment && (
                        <button
                          onClick={() => onOpenRoomAssignment({ roomId: room.id })}
                          className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors flex items-center gap-1"
                          title="Attribuer cette salle à une ou plusieurs promotions"
                        >
                          <DoorClosed className="w-3 h-3 text-emerald-600" />
                          <span>Attribuer</span>
                        </button>
                      )}
                      <button
                        onClick={() => onEditRoom(room)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        title="Modifier la salle"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRoomToDelete(room)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Supprimer la salle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Occupancy Matrix View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Grille d'Occupation Quotidienne des Salles
              </h3>
              <p className="text-xs text-slate-500">Visualisez les locaux occupés et vacants par créneau horaire</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Choisir la date :</label>
              <select
                value={selectedMatrixDate}
                onChange={(e) => setSelectedMatrixDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {uniqueDates.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Matrix table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-600">
                  <th className="p-3 w-44">Salle / Amphi</th>
                  <th className="p-3 w-28">Capacité</th>
                  <th className="p-3">Matinée (08:30 - 11:00)</th>
                  <th className="p-3">Midi (11:00 - 13:30)</th>
                  <th className="p-3">Après-midi (13:30 - 16:30)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rooms.map(room => {
                  const dayExams = exams.filter(
                    e => e.date === selectedMatrixDate && e.salles.some(s => s.roomId === room.id)
                  );

                  return (
                    <tr key={room.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-bold text-slate-800">
                        {room.nom}
                        <span className="block text-[10px] font-normal text-slate-400">{room.type}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-600 font-semibold">{room.capacite} pl.</td>
                      
                      {/* Slots */}
                      {['morning', 'noon', 'afternoon'].map(slot => {
                        const matchingExam = dayExams.find(ex => {
                          const h = parseInt(ex.heureDebut.split(':')[0], 10);
                          if (slot === 'morning') return h < 11;
                          if (slot === 'noon') return h >= 11 && h < 13;
                          return h >= 13;
                        });

                        return (
                          <td key={slot} className="p-2">
                            {matchingExam ? (
                              <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-950 shadow-2xs">
                                <p className="font-bold text-xs truncate">{matchingExam.nomModule}</p>
                                <p className="text-[10px] text-indigo-700 font-mono mt-0.5">
                                  {matchingExam.heureDebut} - {matchingExam.heureFin} • {matchingExam.niveau}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-300 font-medium italic">
                                Libre
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {roomToDelete && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setRoomToDelete(null)}
          onConfirm={() => {
            onDeleteRoom(roomToDelete.id);
            setRoomToDelete(null);
          }}
          title="Supprimer la Salle / Amphi"
          message={`Êtes-vous sûr de vouloir supprimer le local "${roomToDelete.nom}" ? Assurez-vous qu'aucun examen n'y est actuellement affecté.`}
          confirmLabel="Supprimer définitivement"
          isDestructive={true}
        />
      )}
    </div>
  );
};
