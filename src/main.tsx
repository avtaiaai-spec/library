import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {initializeStorage} from './storage';
import {parseLibrary} from './data';
import '@fontsource/cormorant-garamond/cyrillic-500.css';
import '@fontsource/cormorant-garamond/cyrillic-600.css';
import '@fontsource/cormorant-garamond/cyrillic-400-italic.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/golos-text/cyrillic-400.css';
import '@fontsource/golos-text/cyrillic-500.css';
import '@fontsource/golos-text/latin-400.css';
import '@fontsource/golos-text/latin-500.css';
import './styles.css';
async function start(){try{await initializeStorage(parseLibrary)}catch{}createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)}
void start();
