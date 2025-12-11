import type { Theme } from "@tabitabi/types";
import { mapOnlyTheme } from "./config";
import ItineraryView from "./ItineraryView.svelte";
import StepList from "./StepList.svelte";

const theme: Theme = {
  ...mapOnlyTheme,
  components: {
    ItineraryView,
    StepList,
  },
};

export default theme;
