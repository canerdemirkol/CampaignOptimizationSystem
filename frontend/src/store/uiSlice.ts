import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Campaign, OptimizationScenario } from '../types';

interface UIState {
  // Campaign modals
  isCreateCampaignModalOpen: boolean;
  isEditCampaignModalOpen: boolean;
  isDeleteCampaignModalOpen: boolean;
  isCampaignDetailModalOpen: boolean;
  selectedCampaign: Campaign | null;
  editingCampaign: Campaign | null;

  // Customer modals
  isCreateCustomerModalOpen: boolean;
  isEditCustomerModalOpen: boolean;
  isDeleteCustomerModalOpen: boolean;
  selectedCustomerId: string | null;

  // Optimization Scenario modals
  isCreateScenarioModalOpen: boolean;
  isAddCampaignsToScenarioModalOpen: boolean;
  selectedScenario: OptimizationScenario | null;

  // Sidebar
  isSidebarOpen: boolean;

  // Notifications
  notification: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  };
}

const initialState: UIState = {
  isCreateCampaignModalOpen: false,
  isEditCampaignModalOpen: false,
  isDeleteCampaignModalOpen: false,
  isCampaignDetailModalOpen: false,
  selectedCampaign: null,
  editingCampaign: null,

  isCreateCustomerModalOpen: false,
  isEditCustomerModalOpen: false,
  isDeleteCustomerModalOpen: false,
  selectedCustomerId: null,

  isCreateScenarioModalOpen: false,
  isAddCampaignsToScenarioModalOpen: false,
  selectedScenario: null,

  isSidebarOpen: true,

  notification: {
    open: false,
    message: '',
    severity: 'info',
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Campaign modals
    openCreateCampaignModal(state) {
      state.isCreateCampaignModalOpen = true;
    },
    closeCreateCampaignModal(state) {
      state.isCreateCampaignModalOpen = false;
    },
    openEditCampaignModal(state, action: PayloadAction<Campaign>) {
      state.isEditCampaignModalOpen = true;
      state.editingCampaign = action.payload;
    },
    closeEditCampaignModal(state) {
      state.isEditCampaignModalOpen = false;
      state.editingCampaign = null;
    },
    openDeleteCampaignModal(state, action: PayloadAction<Campaign>) {
      state.isDeleteCampaignModalOpen = true;
      state.selectedCampaign = action.payload;
    },
    closeDeleteCampaignModal(state) {
      state.isDeleteCampaignModalOpen = false;
      state.selectedCampaign = null;
    },
    openCampaignDetailModal(state, action: PayloadAction<Campaign>) {
      state.isCampaignDetailModalOpen = true;
      state.selectedCampaign = action.payload;
    },
    closeCampaignDetailModal(state) {
      state.isCampaignDetailModalOpen = false;
      state.selectedCampaign = null;
    },

    // Customer modals
    openCreateCustomerModal(state) {
      state.isCreateCustomerModalOpen = true;
    },
    closeCreateCustomerModal(state) {
      state.isCreateCustomerModalOpen = false;
    },
    openEditCustomerModal(state, action: PayloadAction<string>) {
      state.isEditCustomerModalOpen = true;
      state.selectedCustomerId = action.payload;
    },
    closeEditCustomerModal(state) {
      state.isEditCustomerModalOpen = false;
      state.selectedCustomerId = null;
    },
    openDeleteCustomerModal(state, action: PayloadAction<string>) {
      state.isDeleteCustomerModalOpen = true;
      state.selectedCustomerId = action.payload;
    },
    closeDeleteCustomerModal(state) {
      state.isDeleteCustomerModalOpen = false;
      state.selectedCustomerId = null;
    },

    // Optimization Scenario modals
    openCreateScenarioModal(state) {
      state.isCreateScenarioModalOpen = true;
    },
    closeCreateScenarioModal(state) {
      state.isCreateScenarioModalOpen = false;
    },
    openAddCampaignsToScenarioModal(state, action: PayloadAction<OptimizationScenario>) {
      state.isAddCampaignsToScenarioModalOpen = true;
      state.selectedScenario = action.payload;
    },
    closeAddCampaignsToScenarioModal(state) {
      state.isAddCampaignsToScenarioModalOpen = false;
    },

    // Sidebar
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen;
    },

    // Notifications
    showNotification(state, action: PayloadAction<{ message: string; severity: 'success' | 'error' | 'warning' | 'info' }>) {
      state.notification = {
        open: true,
        message: action.payload.message,
        severity: action.payload.severity,
      };
    },
    hideNotification(state) {
      state.notification.open = false;
    },
  },
});

export const {
  openCreateCampaignModal,
  closeCreateCampaignModal,
  openEditCampaignModal,
  closeEditCampaignModal,
  openDeleteCampaignModal,
  closeDeleteCampaignModal,
  openCampaignDetailModal,
  closeCampaignDetailModal,
  openCreateCustomerModal,
  closeCreateCustomerModal,
  openEditCustomerModal,
  closeEditCustomerModal,
  openDeleteCustomerModal,
  closeDeleteCustomerModal,
  openCreateScenarioModal,
  closeCreateScenarioModal,
  openAddCampaignsToScenarioModal,
  closeAddCampaignsToScenarioModal,
  toggleSidebar,
  showNotification,
  hideNotification,
} = uiSlice.actions;

export default uiSlice.reducer;
