import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import vuetify from './plugins/vuetify';  // Import plugin
import router from './router'
import App from './App.vue'

// FontAwesome imports
import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faUser,
  faHome,
  faClipboardList,
  faFileAlt,
  faChartLine,
  faBell
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faUser, faHome, faClipboardList, faFileAlt, faChartLine, faBell)

const app = createApp(App);
app.use(createPinia());
app.use(vuetify);
app.use(router);

app.component('font-awesome-icon', FontAwesomeIcon)

app.mount('#app');
