import type { Theme } from "@tabitabi/types";
import { mapboxJourneyTheme } from "./config";
import ItineraryView from "./ItineraryView.svelte";
import StepList from "./StepList.svelte";

const theme: Theme = {
  ...mapboxJourneyTheme,
  components: {
    ItineraryView,
    StepList,
  },
};

export default theme;
