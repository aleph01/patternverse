import { mount } from 'svelte';
import '../../lib/styles/tokens.css';
import Demo from './Demo.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Missing music demo mount point');
mount(Demo, { target });
