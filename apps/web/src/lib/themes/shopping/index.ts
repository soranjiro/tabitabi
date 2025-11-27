import type { Theme } from "@tabitabi/types";
import { shoppingTheme } from "./config";
import ItineraryView from "./ItineraryView.svelte";
import StepList from "./StepList.svelte";

const theme: Theme = {
  ...shoppingTheme,
  components: {
    ItineraryView,
    StepList,
  },
};

export default theme;
