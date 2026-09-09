import { Menu, MenuItemConstructorOptions, app, BrowserWindow, dialog } from 'electron';

export function createApplicationMenu(mainWindow: BrowserWindow): Menu {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Nouvelle Session',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu:action', 'new-session');
          }
        },
        {
          label: 'Ouvrir un Projet (.examguard, .json)...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu:action', 'open-project');
          }
        },
        {
          label: 'Sauvegarder le Projet sous...',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu:action', 'save-project');
          }
        },
        { type: 'separator' },
        {
          label: 'Imprimer la Vue Actuelle',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow.webContents.send('menu:action', 'print');
          }
        },
        { type: 'separator' },
        {
          label: isMac ? 'Fermer la Fenêtre' : 'Quitter ExamGuard',
          accelerator: isMac ? 'Cmd+W' : 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Sélectionner Tout' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Recharger l\'Application' },
        { role: 'forceReload', label: 'Forcer le Rechargement' },
        { role: 'toggleDevTools', label: 'Outils de Développement (F12)' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Taille Réelle (100%)' },
        { role: 'zoomIn', label: 'Zoom Avant' },
        { role: 'zoomOut', label: 'Zoom Arrière' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein Écran' }
      ]
    },
    {
      label: 'Fenêtre',
      submenu: [
        { role: 'minimize', label: 'Réduire' },
        { role: 'zoom', label: 'Agrandir' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const }
            ]
          : [{ role: 'close' as const, label: 'Fermer' }])
      ]
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'À propos',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'À propos d\'ExamGuard',
              message: 'ExamGuard — Version 2027-0',
              detail: 'Développé par : Atallah M.\ne-mail : m.atallah@cu-elbayadh.dz\nDépartement d\'hydraulique et de génie civil\nCentre Universitaire Nour Bachir d\'El-Bayadh',
              buttons: ['Fermer']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  return menu;
}
