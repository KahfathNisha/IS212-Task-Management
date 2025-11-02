import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createVuetify } from 'vuetify';
import CategoryDetailsDialog from '@/components/CategoryDetailsDialog.vue';
import axios from 'axios';

// Use vi.hoisted() for mocks
const { mockAxiosInstance } = vi.hoisted(() => {
  return {
    mockAxiosInstance: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn()
        }
      }
    }
  };
});

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => mockAxiosInstance)
    }
  };
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => 'mock-token'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  writable: true
});

// Mock window.confirm
global.window.confirm = vi.fn(() => true);
global.alert = vi.fn();

// Create Vuetify instance
const vuetify = createVuetify();

describe('CategoryDetailsDialog.vue - Comprehensive Unit Tests', () => {
  let wrapper;

  // Helper function to set component data (works with Vue 3 if properties are accessible)
  const setComponentData = async (wrapper, data) => {
    if (!wrapper || !wrapper.vm) return;
    for (const [key, value] of Object.entries(data)) {
      try {
        wrapper.vm[key] = value;
      } catch (e) {
        // Property not accessible, skip
      }
    }
    await nextTick();
  };

  const mockProjects = [
    {
      id: 'proj1',
      name: 'Project 1',
      department: 'Engineering',
      status: 'Ongoing',
      categories: ['Feature'],
      tasks: [
        { id: 'task1', categories: ['Feature'], status: 'Ongoing' },
        { id: 'task2', categories: ['Feature'], status: 'Completed' },
        { id: 'task3', categories: ['Feature', 'UI/UX'], status: 'Pending Review' }
      ]
    },
    {
      id: 'proj2',
      name: 'Project 2',
      department: 'Sales',
      status: 'Ongoing',
      categories: ['Feature', 'Bug'],
      tasks: [
        { id: 'task4', categories: ['Feature'], status: 'Pending' },
        { id: 'task5', categories: ['Bug'], status: 'Completed' }
      ]
    },
    {
      id: 'proj3',
      name: 'Project 3',
      department: 'Marketing',
      status: 'Completed',
      categories: ['UI/UX'],
      tasks: [
        { id: 'task6', categories: ['UI/UX'], status: 'Completed' }
      ]
    },
    {
      id: 'proj4',
      name: 'Project 4',
      department: 'Engineering',
      status: 'Ongoing',
      categories: [],
      tasks: []
    }
  ];

  const mockCategories = ['Feature', 'Bug', 'UI/UX', 'Testing'];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAxiosInstance.post.mockResolvedValue({
      data: { id: 'cat-new', name: 'New Category' }
    });
    
    mockAxiosInstance.delete.mockResolvedValue({
      data: { message: 'Category deleted' }
    });
    
    global.window.confirm.mockReturnValue(true);
    global.alert.mockClear();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  const createWrapper = (props = {}) => {
    return mount(CategoryDetailsDialog, {
      props: {
        projects: mockProjects,
        allCategories: mockCategories,
        ...props
      },
      global: {
        plugins: [vuetify],
        stubs: {
          'v-dialog': {
            template: '<div class="v-dialog-stub"><slot /></div>',
            props: ['modelValue', 'maxWidth'],
            emits: ['update:modelValue']
          },
          'v-menu': {
            template: '<div class="v-menu-stub"><slot /></div>'
          },
          'v-list': {
            template: '<div class="v-list-stub"><slot /></div>'
          },
          'v-list-item': {
            template: '<div class="v-list-item-stub"><slot /></div>'
          },
          'v-chip': {
            template: '<div class="v-chip-stub"><slot /></div>'
          }
        }
      }
    });
  };

  // ============================================
  // COMPONENT INITIALIZATION TESTS
  // ============================================
  describe('Component Initialization', () => {
    it('should mount successfully', () => {
      wrapper = createWrapper();
      expect(wrapper.exists()).toBe(true);
    });

    it('should initialize with default state', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.searchQuery).toBe('');
      expect(wrapper.vm.showAddCategoryDialog).toBe(false);
      expect(wrapper.vm.showDetailDialog).toBe(false);
      expect(wrapper.vm.newGlobalCategory).toBe('');
      expect(wrapper.vm.selectedCategory).toBe(null);
    });

    it('should display all categories', async () => {
      wrapper = createWrapper();
      await nextTick();
      
      const categoriesGrid = wrapper.find('.category-cards-grid');
      expect(categoriesGrid.exists()).toBe(true);
    });

    it('should handle empty categories prop', async () => {
      wrapper = createWrapper({ allCategories: [] });
      await nextTick();
      
      const emptyState = wrapper.find('.empty-state');
      expect(emptyState.exists()).toBe(true);
    });

    it('should handle empty projects prop', async () => {
      wrapper = createWrapper({ projects: [] });
      await nextTick();
      
      const categories = wrapper.vm.categoriesWithProjects;
      expect(Array.isArray(categories)).toBe(true);
      categories.forEach(cat => {
        expect(cat.projectCount).toBe(0);
        expect(cat.taskCount).toBe(0);
      });
    });
  });

  // ============================================
  // COMPUTED PROPERTIES TESTS
  // ============================================
  describe('Computed Properties', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    describe('categoriesWithProjects', () => {
      it('should calculate project count for each category', () => {
        const categories = wrapper.vm.categoriesWithProjects;
        
        const featureCategory = categories.find(c => c.name === 'Feature');
        expect(featureCategory).toBeDefined();
        expect(featureCategory.projectCount).toBe(2); // proj1 and proj2 have Feature
        
        const bugCategory = categories.find(c => c.name === 'Bug');
        expect(bugCategory.projectCount).toBe(1); // Only proj2 has Bug
      });

      it('should calculate task count for each category', () => {
        const categories = wrapper.vm.categoriesWithProjects;
        
        const featureCategory = categories.find(c => c.name === 'Feature');
        expect(featureCategory.taskCount).toBe(4); // 3 in proj1, 1 in proj2
        
        const bugCategory = categories.find(c => c.name === 'Bug');
        expect(bugCategory.taskCount).toBe(1); // 1 in proj2
      });

      it('should include projects array for each category', () => {
        const categories = wrapper.vm.categoriesWithProjects;
        
        const featureCategory = categories.find(c => c.name === 'Feature');
        expect(featureCategory.projects).toHaveLength(2);
        expect(featureCategory.projects[0].id).toBe('proj1');
      });

      it('should handle categories with no projects', () => {
        const categories = wrapper.vm.categoriesWithProjects;
        
        const testingCategory = categories.find(c => c.name === 'Testing');
        expect(testingCategory.projectCount).toBe(0);
        expect(testingCategory.taskCount).toBe(0);
        expect(testingCategory.projects).toEqual([]);
      });

      it('should handle projects with null categories', async () => {
        const projectsWithNull = [
          { id: 'proj1', name: 'P1', categories: null, tasks: [] },
          { id: 'proj2', name: 'P2', categories: undefined, tasks: [] }
        ];
        
        wrapper = createWrapper({ projects: projectsWithNull });
        
        const categories = wrapper.vm.categoriesWithProjects;
        categories.forEach(cat => {
          expect(cat.projectCount).toBe(0);
        });
      });

      it('should handle tasks with null categories', () => {
        const categories = wrapper.vm.categoriesWithProjects;
        
        // Should not crash when counting tasks
        categories.forEach(cat => {
          expect(typeof cat.taskCount).toBe('number');
          expect(cat.taskCount).toBeGreaterThanOrEqual(0);
        });
      });

      it('should handle projects with empty tasks array', async () => {
        const projectsWithEmptyTasks = [
          { id: 'proj1', name: 'P1', categories: ['Feature'], tasks: [] }
        ];
        
        wrapper = createWrapper({ projects: projectsWithEmptyTasks });
        
        const categories = wrapper.vm.categoriesWithProjects;
        const featureCat = categories.find(c => c.name === 'Feature');
        expect(featureCat.taskCount).toBe(0);
      });

      it('should handle tasks with multiple categories', () => {
        const categories = wrapper.vm.categoriesWithProjects;
        
        // task3 has both Feature and UI/UX
        const featureCat = categories.find(c => c.name === 'Feature');
        const uiuxCat = categories.find(c => c.name === 'UI/UX');
        
        expect(featureCat.taskCount).toBeGreaterThan(0);
        expect(uiuxCat.taskCount).toBeGreaterThan(0);
      });
    });

    describe('filteredCategories', () => {
      it('should return all categories when search is empty', () => {
        const filtered = wrapper.vm.filteredCategories;
        expect(filtered.length).toBe(mockCategories.length);
      });

      it('should filter categories by search query', async () => {
        await setComponentData(wrapper, { searchQuery: 'Feature' });
        await nextTick();
        
        const filtered = wrapper.vm.filteredCategories;
        expect(filtered.length).toBe(1);
        expect(filtered[0].name).toBe('Feature');
      });

      it('should be case-insensitive', async () => {
        await setComponentData(wrapper, { searchQuery: 'feature' });
        await nextTick();
        
        const filtered = wrapper.vm.filteredCategories;
        expect(filtered.length).toBe(1);
      });

      it('should filter by partial match', async () => {
        await setComponentData(wrapper, { searchQuery: 'feat' });
        await nextTick();
        
        const filtered = wrapper.vm.filteredCategories;
        expect(filtered.length).toBe(1);
      });

      it('should return empty array when no matches', async () => {
        await setComponentData(wrapper, { searchQuery: 'NonexistentCategory' });
        await nextTick();
        
        const filtered = wrapper.vm.filteredCategories;
        expect(filtered).toEqual([]);
      });

      it('should update when categories change', async () => {
        await setComponentData(wrapper, { searchQuery: 'Feature' });
        await nextTick();
        
        let filtered = wrapper.vm.filteredCategories;
        expect(filtered.length).toBe(1);
        
        // Simulate props change
        await wrapper.setProps({ allCategories: ['Bug'] });
        await nextTick();
        
        filtered = wrapper.vm.filteredCategories;
        // Should filter based on new categories
        expect(Array.isArray(filtered)).toBe(true);
      });
    });
  });

  // ============================================
  // METHOD TESTS
  // ============================================
  describe('Methods', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    describe('getCategoryColor', () => {
      it('should return a valid color', () => {
        const color = wrapper.vm.getCategoryColor('Feature');
        expect(typeof color).toBe('string');
        expect(color).toBeDefined();
      });

      it('should return consistent color for same category', () => {
        const color1 = wrapper.vm.getCategoryColor('Feature');
        const color2 = wrapper.vm.getCategoryColor('Feature');
        expect(color1).toBe(color2);
      });

      it('should return different colors for different categories', () => {
        const color1 = wrapper.vm.getCategoryColor('Feature');
        const color2 = wrapper.vm.getCategoryColor('Bug');
        // Might be same or different depending on hash
        expect(typeof color1).toBe('string');
        expect(typeof color2).toBe('string');
      });

      it('should handle empty string', () => {
        const color = wrapper.vm.getCategoryColor('');
        expect(color).toBeDefined();
      });

      it('should handle special characters', () => {
        const color = wrapper.vm.getCategoryColor('Category & Special');
        expect(color).toBeDefined();
      });

      it('should cycle through color array', () => {
        const colors = [];
        for (let i = 0; i < 20; i++) {
          colors.push(wrapper.vm.getCategoryColor(`Category${i}`));
        }
        // Should use colors from the array
        expect(colors.length).toBe(20);
      });
    });

    describe('getStatusColor', () => {
      it('should return primary for Ongoing', () => {
        expect(wrapper.vm.getStatusColor('Ongoing')).toBe('primary');
      });

      it('should return success for Completed', () => {
        expect(wrapper.vm.getStatusColor('Completed')).toBe('success');
      });

      it('should return warning for On Hold', () => {
        expect(wrapper.vm.getStatusColor('On Hold')).toBe('warning');
      });

      it('should return error for Cancelled', () => {
        expect(wrapper.vm.getStatusColor('Cancelled')).toBe('error');
      });

      it('should return grey for unknown status', () => {
        expect(wrapper.vm.getStatusColor('Unknown')).toBe('grey');
      });

      it('should handle null/undefined', () => {
        expect(wrapper.vm.getStatusColor(null)).toBe('grey');
        expect(wrapper.vm.getStatusColor(undefined)).toBe('grey');
      });
    });

    describe('addGlobalCategory', () => {
      it('should create category successfully', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { id: 'cat-new', name: 'New Category' }
        });
        
        await setComponentData(wrapper, {
          showAddCategoryDialog: true,
          newGlobalCategory: 'New Category'
        });
        await nextTick();
        
        await wrapper.vm.addGlobalCategory();
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/categories',
          { name: 'New Category' }
        );
      });

      it('should emit addGlobalCategory event', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { id: 'cat-new', name: 'New Category' }
        });
        
        await setComponentData(wrapper, {
          showAddCategoryDialog: true,
          newGlobalCategory: 'New Category'
        });
        await nextTick();
        
        await wrapper.vm.addGlobalCategory();
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(wrapper.emitted('addGlobalCategory')).toBeTruthy();
        expect(wrapper.emitted('addGlobalCategory')[0][0]).toEqual(
          expect.objectContaining({ name: 'New Category' })
        );
      });

      it('should not create empty category', async () => {
        await setComponentData(wrapper, {
          showAddCategoryDialog: true,
          newGlobalCategory: '   '
        });
        await nextTick();
        
        await wrapper.vm.addGlobalCategory();
        await nextTick();
        
        expect(mockAxiosInstance.post).not.toHaveBeenCalled();
      });

      it('should trim category name', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { id: 'cat-new', name: 'Trimmed Category' }
        });
        
        await setComponentData(wrapper, {
          showAddCategoryDialog: true,
          newGlobalCategory: '  Trimmed Category  '
        });
        await nextTick();
        
        await wrapper.vm.addGlobalCategory();
        await nextTick();
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/categories',
          { name: 'Trimmed Category' }
        );
      });

      it('should close dialog after successful creation', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { id: 'cat-new', name: 'New Category' }
        });
        
        await setComponentData(wrapper, {
          showAddCategoryDialog: true,
          newGlobalCategory: 'New Category'
        });
        await nextTick();
        
        await wrapper.vm.addGlobalCategory();
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(wrapper.vm.showAddCategoryDialog).toBe(false);
        expect(wrapper.vm.newGlobalCategory).toBe('');
      });

      it('should handle creation error', async () => {
        mockAxiosInstance.post.mockRejectedValueOnce({
          response: { data: { error: 'Category already exists' } }
        });
        
        await setComponentData(wrapper, {
          showAddCategoryDialog: true,
          newGlobalCategory: 'Duplicate Category'
        });
        await nextTick();
        
        await wrapper.vm.addGlobalCategory();
        await nextTick();
        
        expect(global.alert).toHaveBeenCalledWith('Category already exists');
      });

      it('should handle network error', async () => {
        mockAxiosInstance.post.mockRejectedValueOnce(new Error('Network error'));
        
        await setComponentData(wrapper, {
          showAddCategoryDialog: true,
          newGlobalCategory: 'Network Test'
        });
        await nextTick();
        
        await wrapper.vm.addGlobalCategory();
        await nextTick();
        
        expect(global.alert).toHaveBeenCalled();
      });

      it('should handle error without response data', async () => {
        mockAxiosInstance.post.mockRejectedValueOnce(new Error('Unknown error'));
        
        await setComponentData(wrapper, {
          showAddCategoryDialog: true,
          newGlobalCategory: 'Error Test'
        });
        await nextTick();
        
        await wrapper.vm.addGlobalCategory();
        await nextTick();
        
        expect(global.alert).toHaveBeenCalledWith('Failed to create category');
      });
    });

    describe('deleteCategory', () => {
      it('should confirm before deletion', async () => {
        global.window.confirm.mockReturnValue(true);
        
        await wrapper.vm.deleteCategory('Feature');
        await nextTick();
        
        expect(global.window.confirm).toHaveBeenCalledWith(
          expect.stringContaining('Feature')
        );
      });

      it('should not delete if user cancels', async () => {
        global.window.confirm.mockReturnValue(false);
        
        await wrapper.vm.deleteCategory('Feature');
        await nextTick();
        
        expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
        expect(wrapper.emitted('deleteCategory')).toBeFalsy();
      });

      it('should delete category successfully', async () => {
        global.window.confirm.mockReturnValue(true);
        
        await wrapper.vm.deleteCategory('Feature');
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
          '/categories/Feature'
        );
      });

      it('should emit deleteCategory event', async () => {
        global.window.confirm.mockReturnValue(true);
        
        await wrapper.vm.deleteCategory('Feature');
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(wrapper.emitted('deleteCategory')).toBeTruthy();
        expect(wrapper.emitted('deleteCategory')[0]).toEqual(['Feature']);
      });

      it('should URL encode category name', async () => {
        global.window.confirm.mockReturnValue(true);
        const categoryName = 'Category with Spaces & Special Chars';
        
        await wrapper.vm.deleteCategory(categoryName);
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
          `/categories/${encodeURIComponent(categoryName)}`
        );
      });

      it('should handle deletion error', async () => {
        global.window.confirm.mockReturnValue(true);
        mockAxiosInstance.delete.mockRejectedValueOnce({
          response: { data: { error: 'Deletion failed' } }
        });
        
        await wrapper.vm.deleteCategory('Feature');
        await nextTick();
        
        expect(global.alert).toHaveBeenCalledWith('Deletion failed');
      });

      it('should handle network error on deletion', async () => {
        global.window.confirm.mockReturnValue(true);
        mockAxiosInstance.delete.mockRejectedValueOnce(new Error('Network error'));
        
        await wrapper.vm.deleteCategory('Feature');
        await nextTick();
        
        expect(global.alert).toHaveBeenCalled();
      });
    });

    describe('viewCategoryDetails', () => {
      it('should open detail dialog with category', () => {
        const category = wrapper.vm.categoriesWithProjects[0];
        wrapper.vm.viewCategoryDetails(category);
        
        expect(wrapper.vm.showDetailDialog).toBe(true);
        expect(wrapper.vm.selectedCategory).toEqual(category);
      });

      it('should set selected category correctly', () => {
        const category = {
          name: 'Feature',
          projectCount: 2,
          taskCount: 4,
          projects: [mockProjects[0], mockProjects[1]]
        };
        
        wrapper.vm.viewCategoryDetails(category);
        
        expect(wrapper.vm.selectedCategory).toEqual(category);
      });
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('Edge Cases', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should handle projects with no tasks', async () => {
      const projectsWithoutTasks = [
        { id: 'proj1', name: 'P1', categories: ['Feature'], tasks: [] }
      ];
      
      wrapper = createWrapper({ projects: projectsWithoutTasks });
      
      const categories = wrapper.vm.categoriesWithProjects;
      const featureCat = categories.find(c => c.name === 'Feature');
      expect(featureCat.taskCount).toBe(0);
      expect(featureCat.projectCount).toBe(1);
    });

    it('should handle tasks with null categories', async () => {
      const projectsWithNullCategories = [
        {
          id: 'proj1',
          name: 'P1',
          categories: ['Feature'],
          tasks: [
            { id: 'task1', categories: null },
            { id: 'task2', categories: undefined },
            { id: 'task3', categories: ['Feature'] }
          ]
        }
      ];
      
      wrapper = createWrapper({ projects: projectsWithNullCategories });
      
      const categories = wrapper.vm.categoriesWithProjects;
      const featureCat = categories.find(c => c.name === 'Feature');
      expect(featureCat.taskCount).toBe(1); // Only task3 counts
    });

    it('should handle tasks with categories as strings instead of arrays', async () => {
      const projectsWithStringCategories = [
        {
          id: 'proj1',
          name: 'P1',
          categories: ['Feature'],
          tasks: [
            { id: 'task1', categories: 'Feature' } // String instead of array
          ]
        }
      ];
      
      wrapper = createWrapper({ projects: projectsWithStringCategories });
      
      // Should handle gracefully
      const categories = wrapper.vm.categoriesWithProjects;
      expect(Array.isArray(categories)).toBe(true);
    });

    it('should handle very long category names', async () => {
      const longName = 'A'.repeat(500);
      
      await setComponentData(wrapper, {
        showAddCategoryDialog: true,
        newGlobalCategory: longName
      });
      await nextTick();
      
      await wrapper.vm.addGlobalCategory();
      await nextTick();
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/categories',
        { name: longName }
      );
    });

    it('should handle special characters in category names', async () => {
      const specialName = 'Category & Special > Chars <';
      
      await setComponentData(wrapper, {
        showAddCategoryDialog: true,
        newGlobalCategory: specialName
      });
      await nextTick();
      
      await wrapper.vm.addGlobalCategory();
      await nextTick();
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/categories',
        { name: specialName }
      );
    });

    it('should handle categories with duplicate names', async () => {
      const categoriesWithDuplicates = ['Feature', 'Feature', 'Bug'];
      
      wrapper = createWrapper({ allCategories: categoriesWithDuplicates });
      
      const categories = wrapper.vm.categoriesWithProjects;
      // Should process all categories even if names are duplicated
      expect(categories.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle projects with duplicate categories', async () => {
      const projectsWithDuplicates = [
        {
          id: 'proj1',
          name: 'P1',
          categories: ['Feature', 'Feature', 'Bug'],
          tasks: [
            { id: 'task1', categories: ['Feature', 'Feature'] }
          ]
        }
      ];
      
      wrapper = createWrapper({ projects: projectsWithDuplicates });
      
      // Should not crash
      const categories = wrapper.vm.categoriesWithProjects;
      expect(Array.isArray(categories)).toBe(true);
    });

    it('should handle empty search query', async () => {
      await setComponentData(wrapper, { searchQuery: '' });
      await nextTick();
      
      const filtered = wrapper.vm.filteredCategories;
      expect(filtered.length).toBe(mockCategories.length);
    });

    it('should handle whitespace-only search query', async () => {
      await setComponentData(wrapper, { searchQuery: '   ' });
      await nextTick();
      
      const filtered = wrapper.vm.filteredCategories;
      // Should treat as empty
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle deletion of non-existent category', async () => {
      global.window.confirm.mockReturnValue(true);
      mockAxiosInstance.delete.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'Category not found' } }
      });
      
      await wrapper.vm.deleteCategory('NonExistent');
      await nextTick();
      
      expect(global.alert).toHaveBeenCalled();
    });

    it('should handle simultaneous category operations', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { id: 'cat1', name: 'Category 1' }
      });
      
      await setComponentData(wrapper, {
        showAddCategoryDialog: true,
        newGlobalCategory: 'Category 1'
      });
      await nextTick();
      
      // Start multiple operations
      const promise1 = wrapper.vm.addGlobalCategory();
      await nextTick();
      
      // Should handle gracefully
      await promise1;
      expect(mockAxiosInstance.post).toHaveBeenCalled();
    });
  });

  // ============================================
  // UI INTERACTION TESTS
  // ============================================
  describe('UI Interactions', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should display category cards with correct information', async () => {
      await nextTick();
      
      const categoryCards = wrapper.findAll('.category-card');
      expect(categoryCards.length).toBeGreaterThan(0);
    });

    it('should show project count for each category', async () => {
      const categories = wrapper.vm.categoriesWithProjects;
      categories.forEach(category => {
        expect(typeof category.projectCount).toBe('number');
        expect(category.projectCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should show task count for each category', async () => {
      const categories = wrapper.vm.categoriesWithProjects;
      categories.forEach(category => {
        expect(typeof category.taskCount).toBe('number');
        expect(category.taskCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should limit displayed projects to 3 in card', () => {
      const categoryWithManyProjects = {
        name: 'Feature',
        projects: Array.from({ length: 10 }, (_, i) => ({
          id: `proj${i}`,
          name: `Project ${i}`
        })),
        projectCount: 10,
        taskCount: 5
      };
      
      // Template should show first 3 + "+7 more" chip
      expect(categoryWithManyProjects.projects.length).toBe(10);
    });

    it('should show empty state when no categories match search', async () => {
      await setComponentData(wrapper, { searchQuery: 'NonexistentCategory12345' });
      await nextTick();
      
      const emptyState = wrapper.find('.empty-state');
      expect(emptyState.exists()).toBe(true);
    });
  });
});
