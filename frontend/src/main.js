import { createApp } from 'vue'
import './style.css'
import vuetify from './plugins/vuetify';  // Import plugin
import router from './router'
import App from './App.vue'

// FontAwesome imports
import { library } from '@fortawesome/fontawesome-svg-core'
import { faUser, faHome, faTasks, faChartBar, faBell, faCog, faSignOutAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

// Add icons to library
library.add(faUser, faHome, faTasks, faChartBar, faBell, faCog, faSignOutAlt)

const app = createApp(App);
app.use(vuetify);
app.use(router);

// Register FontAwesome component globally
app.component('font-awesome-icon', FontAwesomeIcon)

app.mount('#app');
