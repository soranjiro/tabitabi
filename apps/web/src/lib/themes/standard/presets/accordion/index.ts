import type { Theme } from "@tabitabi/types";
import { accordionTheme } from "./config";
import ItineraryView from "./ItineraryView.svelte";
import StepList from "../../core/StepList.svelte";
const theme: Theme = { ...accordionTheme, components: { ItineraryView, StepList } };
export default theme;
