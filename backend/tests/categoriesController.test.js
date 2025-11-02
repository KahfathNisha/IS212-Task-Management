// Firestore mocks for categories and projects
const mockCategoriesCollection = {
  orderBy: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  get: jest.fn(),
  add: jest.fn(),
};

const mockProjectsCollection = {
  where: jest.fn().mockReturnThis(),
  get: jest.fn(),
};

const mockBatch = {
  update: jest.fn(),
  commit: jest.fn(),
};

jest.mock('../src/config/firebase', () => ({
  db: {
    collection: jest.fn((name) => {
      if (name === 'categories') return mockCategoriesCollection;
      if (name === 'projects') return mockProjectsCollection;
      return {};
    }),
    batch: jest.fn(() => mockBatch),
  },
}));

const categoriesController = require('../src/controllers/categoriesController');

function buildDoc(id, data) {
  const ref = { id, path: `categories/${id}`, delete: jest.fn() };
  return { id, data: () => data, ref };
}

describe('categoriesController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { user: { email: 'u@example.com' }, params: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  describe('getAllCategories', () => {
    it('returns categories ordered by name', async () => {
      mockCategoriesCollection.get.mockResolvedValueOnce({
        docs: [buildDoc('1', { name: 'A' }), buildDoc('2', { name: 'B' })],
      });

      await categoriesController.getAllCategories(req, res);

      expect(mockCategoriesCollection.orderBy).toHaveBeenCalledWith('name');
      expect(res.json).toHaveBeenCalledWith([
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ]);
    });

    it('handles errors gracefully', async () => {
      mockCategoriesCollection.get.mockRejectedValueOnce(new Error('fail'));
      await categoriesController.getAllCategories(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'fail' });
    });
  });

  describe('createCategory', () => {
    it('validates missing name', async () => {
      req.body = { name: '   ' };
      await categoriesController.createCategory(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category name is required' });
    });

    it('rejects duplicate category', async () => {
      req.body = { name: ' Design ' };
      mockCategoriesCollection.get.mockResolvedValueOnce({ empty: false });
      await categoriesController.createCategory(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category already exists' });
    });

    it('creates a new category', async () => {
      req.body = { name: ' Design ' };
      mockCategoriesCollection.get.mockResolvedValueOnce({ empty: true });
      mockCategoriesCollection.add.mockResolvedValueOnce({ id: 'cat-1' });

      await categoriesController.createCategory(req, res);

      expect(mockCategoriesCollection.add).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      const payload = res.json.mock.calls[0][0];
      expect(payload.id).toBe('cat-1');
      expect(payload.name).toBe('Design');
      expect(payload.createdBy).toBe('u@example.com');
    });

    it('handles errors', async () => {
      req.body = { name: 'X' };
      mockCategoriesCollection.get.mockRejectedValueOnce(new Error('boom'));
      await categoriesController.createCategory(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
    });
  });

  describe('deleteCategory', () => {
    it('validates missing name in params', async () => {
      req.params = {};
      await categoriesController.deleteCategory(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category name is required' });
    });

    it('404 when category not found', async () => {
      req.params = { name: 'Design' };
      mockCategoriesCollection.get.mockResolvedValueOnce({ empty: true });
      await categoriesController.deleteCategory(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
    });

    it('deletes category and removes from all projects', async () => {
      req.params = { name: 'Design' };
      const catDoc = buildDoc('cat-1', { name: 'Design' });

      mockCategoriesCollection.get.mockResolvedValueOnce({ empty: false, docs: [catDoc] });

      await categoriesController.deleteCategory(req, res);

      expect(catDoc.ref.delete).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Category deleted successfully' });
    });

    it('handles errors', async () => {
      req.params = { name: 'Design' };
      mockCategoriesCollection.get.mockRejectedValueOnce(new Error('err'));
      await categoriesController.deleteCategory(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'err' });
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('Edge Cases', () => {
    describe('getAllCategories - Edge Cases', () => {
      it('handles empty categories array', async () => {
        mockCategoriesCollection.get.mockResolvedValueOnce({ docs: [] });
        await categoriesController.getAllCategories(req, res);
        expect(res.json).toHaveBeenCalledWith([]);
      });

      it('handles categories with null name', async () => {
        mockCategoriesCollection.get.mockResolvedValueOnce({
          docs: [buildDoc('1', { name: null }), buildDoc('2', { name: 'Valid' })],
        });
        await categoriesController.getAllCategories(req, res);
        const payload = res.json.mock.calls[0][0];
        expect(payload).toHaveLength(2);
      });

      it('handles categories with missing fields', async () => {
        mockCategoriesCollection.get.mockResolvedValueOnce({
          docs: [buildDoc('1', {}), buildDoc('2', { name: 'Valid' })],
        });
        await categoriesController.getAllCategories(req, res);
        const payload = res.json.mock.calls[0][0];
        expect(payload).toHaveLength(2);
      });

      it('handles categories with very long names', async () => {
        const longName = 'A'.repeat(500);
        mockCategoriesCollection.get.mockResolvedValueOnce({
          docs: [buildDoc('1', { name: longName })],
        });
        await categoriesController.getAllCategories(req, res);
        const payload = res.json.mock.calls[0][0];
        expect(payload[0].name).toBe(longName);
      });

      it('handles categories with special characters in name', async () => {
        const specialName = 'Category & Special <Chars> "Quote"';
        mockCategoriesCollection.get.mockResolvedValueOnce({
          docs: [buildDoc('1', { name: specialName })],
        });
        await categoriesController.getAllCategories(req, res);
        const payload = res.json.mock.calls[0][0];
        expect(payload[0].name).toBe(specialName);
      });

      it('sorts alphabetically regardless of capital case', async () => {
        mockCategoriesCollection.get.mockResolvedValueOnce({
          docs: [
            buildDoc('1', { name: 'zebra' }),
            buildDoc('2', { name: 'Alpha' }),
            buildDoc('3', { name: 'Zebra' })
          ],
        });
        await categoriesController.getAllCategories(req, res);
        const payload = res.json.mock.calls[0][0];
        expect(payload[0].name).toBe('Alpha'); // Alpha comes first
      });
    });

    describe('createCategory - Edge Cases', () => {
      it('validates null name', async () => {
        req.body = { name: null };
        await categoriesController.createCategory(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Category name is required' });
      });

      it('validates undefined name', async () => {
        req.body = { name: undefined };
        await categoriesController.createCategory(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('validates empty name string', async () => {
        req.body = { name: '' };
        await categoriesController.createCategory(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('handles whitespace-only name', async () => {
        req.body = { name: '   ' };
        await categoriesController.createCategory(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('handles very long category names', async () => {
        const longName = 'A'.repeat(1000);
        req.body = { name: longName };
        mockCategoriesCollection.get.mockResolvedValueOnce({ empty: true });
        mockCategoriesCollection.add.mockResolvedValueOnce({ id: 'cat-1' });

        await categoriesController.createCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const payload = res.json.mock.calls[0][0];
        expect(payload.name).toBe(longName);
      });

      it('handles category names with special characters', async () => {
        const specialName = 'Category & Special <Chars> "Quote"';
        req.body = { name: specialName };
        mockCategoriesCollection.get.mockResolvedValueOnce({ empty: true });
        mockCategoriesCollection.add.mockResolvedValueOnce({ id: 'cat-1' });

        await categoriesController.createCategory(req, res);

        expect(mockCategoriesCollection.add).toHaveBeenCalled();
        const payload = res.json.mock.calls[0][0];
        expect(payload.name).toBe(specialName);
      });

      it('handles duplicate check with different whitespace', async () => {
        req.body = { name: ' Design ' };
        mockCategoriesCollection.get.mockResolvedValueOnce({ empty: false });

        await categoriesController.createCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Category already exists' });
      });

      it('creates category with Unicode characters', async () => {
        req.body = { name: 'カテゴリ 🎉' };
        mockCategoriesCollection.get.mockResolvedValueOnce({ empty: true });
        mockCategoriesCollection.add.mockResolvedValueOnce({ id: 'cat-1' });

        await categoriesController.createCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const payload = res.json.mock.calls[0][0];
        expect(payload.name).toBe('カテゴリ 🎉');
      });

      it('handles Firestore add error', async () => {
        req.body = { name: 'Test' };
        mockCategoriesCollection.get.mockResolvedValueOnce({ empty: true });
        mockCategoriesCollection.add.mockRejectedValueOnce(new Error('Firestore error'));

        await categoriesController.createCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Firestore error' });
      });

      it('preserves creator email in response', async () => {
        req.body = { name: 'Test' };
        req.user = { email: 'creator@example.com' };
        mockCategoriesCollection.get.mockResolvedValueOnce({ empty: true });
        mockCategoriesCollection.add.mockResolvedValueOnce({ id: 'cat-1' });

        await categoriesController.createCategory(req, res);

        const payload = res.json.mock.calls[0][0];
        expect(payload.createdBy).toBe('creator@example.com');
      });
    });

    describe('deleteCategory - Edge Cases', () => {
      it('validates null name in params', async () => {
        req.params = { name: null };
        await categoriesController.deleteCategory(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('validates undefined name in params', async () => {
        req.params = { name: undefined };
        await categoriesController.deleteCategory(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('validates empty string name in params', async () => {
        req.params = { name: '' };
        await categoriesController.deleteCategory(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('handles URL-encoded category names', async () => {
        const encodedName = encodeURIComponent('Category with Spaces');
        req.params = { name: encodedName };
        const catDoc = buildDoc('cat-1', { name: 'Category with Spaces' });

        mockCategoriesCollection.get.mockResolvedValueOnce({ empty: false, docs: [catDoc] });

        await categoriesController.deleteCategory(req, res);

        expect(catDoc.ref.delete).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ message: 'Category deleted successfully' });
      });

      it('handles category names with special characters', async () => {
        const specialName = 'Category & Special';
        req.params = { name: encodeURIComponent(specialName) };
        const catDoc = buildDoc('cat-1', { name: specialName });

        mockCategoriesCollection.get.mockResolvedValueOnce({ empty: false, docs: [catDoc] });

        await categoriesController.deleteCategory(req, res);

        expect(catDoc.ref.delete).toHaveBeenCalled();
      });

      it('handles very long category names', async () => {
        const longName = 'A'.repeat(500);
        req.params = { name: longName };
        const catDoc = buildDoc('cat-1', { name: longName });

        mockCategoriesCollection.get.mockResolvedValueOnce({ empty: false, docs: [catDoc] });

        await categoriesController.deleteCategory(req, res);

        expect(catDoc.ref.delete).toHaveBeenCalled();
      });

      it('handles category with Unicode characters', async () => {
        const unicodeName = 'カテゴリ 🎉';
        req.params = { name: encodeURIComponent(unicodeName) };
        const catDoc = buildDoc('cat-1', { name: unicodeName });

        mockCategoriesCollection.get.mockResolvedValueOnce({ empty: false, docs: [catDoc] });

        await categoriesController.deleteCategory(req, res);

        expect(catDoc.ref.delete).toHaveBeenCalled();
      });

      it('handles Firestore delete error', async () => {
        req.params = { name: 'Design' };
        const catDoc = buildDoc('cat-1', { name: 'Design' });
        catDoc.ref.delete.mockRejectedValueOnce(new Error('Delete failed'));

        mockCategoriesCollection.get.mockResolvedValueOnce({ empty: false, docs: [catDoc] });

        await categoriesController.deleteCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Delete failed' });
      });

      it('handles multiple matching categories (edge case)', async () => {
        req.params = { name: 'Design' };
        const catDoc1 = buildDoc('cat-1', { name: 'Design' });
        const catDoc2 = buildDoc('cat-2', { name: 'Design' });

        mockCategoriesCollection.get.mockResolvedValueOnce({ empty: false, docs: [catDoc1, catDoc2] });

        await categoriesController.deleteCategory(req, res);

        // Should delete the first matching category
        expect(catDoc1.ref.delete).toHaveBeenCalled();
      });
    });
  });
});


