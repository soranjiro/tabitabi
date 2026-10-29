// Keep only the below-the-fold rendering optimization here.
// The current landing-page visual system lives in +page.svelte; importing the
// legacy hero tuning styles would override the new mobile/desktop dimensions.
import './home/defer-below-fold.css';
