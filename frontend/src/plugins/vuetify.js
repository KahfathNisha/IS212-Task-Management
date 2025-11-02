import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

import 'vuetify/labs/VDataTable/VDataTable.css';
import 'vuetify/labs/VTimeline/VTimeline.css';
// Component Imports
import { createVuetify } from 'vuetify';
import { VDataTable } from 'vuetify/labs/VDataTable';
import { VTimeline, VTimelineItem } from 'vuetify/labs/VTimeline';
import {
  VApp,
  VMain,
  VAppBar,
  VAppBarNavIcon,
  VToolbarTitle,
  VBtn,
  VCard,
  VTextField,
  VSelect,
  VNavigationDrawer,
  VDatePicker,
  VList,
  VListItem,
  VListItemSubtitle,
  VAutocomplete,
  VCheckbox,
  VContainer,
  VRow,
  VCol,
  VSpacer,
  VListItemTitle,
  VIcon,
} from 'vuetify/components';

export default createVuetify({
  components: {
    VApp,
    VMain,
    VAppBar,
    VAppBarNavIcon,
    VToolbarTitle,
    VBtn,
    VCard,
    VTextField,
    VSelect,
    VNavigationDrawer,
    VDatePicker,
    VList,
    VListItem,
    VListItemSubtitle,
    VListItemTitle,
    VAutocomplete,
    VCheckbox,
    VContainer,
    VRow,
    VCol,
    VSpacer,
    VIcon,
    VDataTable,
    VTimeline,
    VTimelineItem,
  },
  theme: {
    defaultTheme: 'light', // Optional: customize theme
    light: {
        dark: false,
        colors: {
          primary: '#3a5998', // Your theme color
          secondary: '#7b92d1',
          accent: '#c5d49a',
          error: '#EF5350',
          warning: '#FFA726',
          info: '#42A5F5',
          success: '#66BB6A',
          purple: '#B39DDB', // For "Pending Review"
        },
      },
  },
  icons: {
    defaultSet: 'mdi',
  },
});

