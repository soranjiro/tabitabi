import type { Theme } from "@tabitabi/types";
import { planningDraftTheme } from "./config";
import ItineraryView from "./ItineraryView.svelte";

const theme: Theme = {
  ...planningDraftTheme,
  components: { ItineraryView },
};

export default theme;

