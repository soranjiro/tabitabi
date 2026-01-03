import type { Theme } from "@tabitabi/types";
import ItineraryView from "./ItineraryView.svelte";
import StepList from "./StepList.svelte";
import { saunaRallyTheme } from "./config";

const theme: Theme = {
  ...saunaRallyTheme,
  components: {
    ItineraryView,
    StepList,
  },
};

export default theme;
