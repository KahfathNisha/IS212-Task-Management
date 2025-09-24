import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

import {
  VApp,
  VBtn,
  VCard,
  VTextField,
  VSelect,
  VNavigationDrawer,
  VDatePicker,
  VList,
  VListItem,
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
    VBtn,
    VCard,
    VTextField,
    VSelect,
    VNavigationDrawer,
    VDatePicker,
    VList,
    VListItem,
    VListItemTitle,
    VAutocomplete,
    VCheckbox,
    VContainer,
    VRow,
    VCol,
    VSpacer,
    VIcon,
    
  },
  theme: {
    defaultTheme: 'light',  // Optional: customize theme
  },
});
