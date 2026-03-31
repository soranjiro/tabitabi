import type { Theme } from "@tabitabi/types";
import { seasonsTheme } from "./config";
import ItineraryView from "./ItineraryView.svelte";

const standardSeasonsTheme: Theme = { ...seasonsTheme, components: { ItineraryView } };
export default standardSeasonsTheme;
