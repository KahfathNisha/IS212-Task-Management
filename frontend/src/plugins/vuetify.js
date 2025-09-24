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
  VAutocomplete,
  VCheckbox,
  VContainer,
  VRow,
  VCol,
  VSpacer,
  
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
    VAutocomplete,
    VCheckbox,
    VContainer,
    VRow,
    VCol,
    VSpacer,
    
  },
  theme: {
    defaultTheme: 'light',  // Optional: customize theme
  },
});
