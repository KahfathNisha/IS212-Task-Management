<template>
  <v-navigation-drawer v-model="drawer" app left color="white" mini-variant mini-variant-width="130">
    <div class="nav-container">
      <v-list flat class="nav-list">
        <v-list-item-group v-model="selectedItem" class="nav-item-group">
          <v-list-item v-for="(item, i) in items" :key="i" active-class="border" :ripple="false" :to="item.to" class="nav-item">
            <v-list-item-content class="nav-content">
              <font-awesome-icon :icon="['fas', item.icon]" size="lg" :class="['nav-icon', selectedItem === i ? 'active-icon' : '']" />
              <v-list-item-subtitle v-text="item.text" class="nav-text"></v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list-item-group>
      </v-list>
      <div class="logout">
        <font-awesome-icon icon="fa-solid fa-sign-out-alt" /><br><span class="caption">Logout</span>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script>
export default {
  name: 'NavBar',
  data: () => ({
    selectedItem: 0,
    drawer: null,
    items: [
      { text: 'Home', to: '/', icon: 'home' },
      { text: 'Tasks', to: '/tasks', icon: 'tasks' },
      { text: 'Reports', to: '/reports', icon: 'chart-bar' },
      { text: 'Dashboards', to: '/dashboards', icon: 'chart-bar' },
      { text: 'Notifications', to: '/notifications', icon: 'bell' },
      { text: 'Profile', to: '/profile', icon: 'user' },
    ],
  }),
}
</script>

<style>
.nav-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.nav-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: 80px;
}

.nav-item-group {
  height: 100%;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-evenly !important;
}

.nav-item {
  flex:  none !important;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px !important;
  margin: 0 !important;
  padding: 30px 0 !important;
  border-radius: 16px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.nav-content {
  flex-direction: row !important;
  align-items: center !important;
}
.nav-icon {
  margin-right: 8px !important;
}
.nav-text {
  font-size: 16px !important;
  font-weight: 500 !important;
  letter-spacing: 0.5px !important;
  text-transform: uppercase !important;
  line-height: 1.2 !important;
  margin-top: 0 !important;
  text-align: left !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.logout {
  text-align: center;
  padding: 20px 0;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.3s ease;
}
.nav-item.border {
  background: rgba(0, 0, 0, 0.005) !important;
  padding: 12px;
}
.border {
  text-decoration: none;
}
.v-list-item-group .v-list-item--active {
  color: beige !important;
}
.theme--light.v-list-item--active .v-list-item__subtitle, .theme--light.v-list-item .v-list-item__action-text {
  color: beige !important;
}
</style>