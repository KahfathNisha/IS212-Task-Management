import { createApp } from 'vue'
import './style.css'
import vuetify from './plugins/vuetify';  // Import plugin
import router from './router'
import App from './App.vue'

const app = createApp(App);
app.use(vuetify);
app.use(router);
app.mount('#app');
