import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

import 'vuetify/labs/VDataTable/VDataTable.css';
// Component Imports
import { createVuetify } from 'vuetify';
import { VDataTable } from 'vuetify/labs/VDataTable';
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
  },
  theme: {
    defaultTheme: 'light', // Optional: customize theme
  },
  icons: {
    defaultSet: 'mdi',
  },
});

