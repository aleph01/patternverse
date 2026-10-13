import { mount } from 'svelte';
import '../../app.css';
import Demo from './Demo.svelte';
const target = document.getElementById('app');
if (!target) throw new Error('Missing demo mount point');
mount(Demo, { target });
