import { mount } from 'svelte';
import '../../app.css';
import Studio from './StudioShell.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Missing illustration studio mount point.');
mount(Studio, { target });
