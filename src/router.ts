import { createRouter, createWebHistory } from 'vue-router'
import OverviewPage from './views/OverviewPage.vue'
import GatePage from './views/GatePage.vue'
import CashierPage from './views/CashierPage.vue'
import VehiclesPage from './views/VehiclesPage.vue'
import RecordsPage from './views/RecordsPage.vue'
import ExceptionsPage from './views/ExceptionsPage.vue'
import RulesPage from './views/RulesPage.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: OverviewPage },
    { path: '/gate', component: GatePage },
    { path: '/cashier', component: CashierPage },
    { path: '/vehicles', component: VehiclesPage },
    { path: '/records', component: RecordsPage },
    { path: '/exceptions', component: ExceptionsPage },
    { path: '/rules', component: RulesPage },
  ],
})
