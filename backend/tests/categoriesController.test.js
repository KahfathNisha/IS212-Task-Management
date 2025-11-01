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
  return { id, data: () => data, ref: { id, path: `categories/${id}` } };
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
      catDoc.ref.delete = jest.fn();

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
});


