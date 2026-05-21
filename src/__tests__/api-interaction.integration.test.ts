import { ApiInteraction, type ApiValidation, type ApiRequest } from '../lib/ApiInteraction'
import { RecordedAction } from '../types'

describe('API Interaction Integration Tests', () => {
  let apiInteraction: ApiInteraction

  beforeEach(() => {
    apiInteraction = new ApiInteraction()
  })

  describe('API request creation', () => {
    it('should create GET request', () => {
      const request = ApiInteraction.createGetRequest('https://api.example.com/users')

      expect(request.method).toBe('GET')
      expect(request.url).toBe('https://api.example.com/users')
    })

    it('should create GET request with headers', () => {
      const headers = { Authorization: 'Bearer token' }
      const request = ApiInteraction.createGetRequest('https://api.example.com/users', headers)

      expect(request.headers).toEqual(headers)
    })

    it('should create POST request', () => {
      const body = { name: 'John', email: 'john@example.com' }
      const request = ApiInteraction.createPostRequest('https://api.example.com/users', body)

      expect(request.method).toBe('POST')
      expect(request.body).toEqual(body)
    })

    it('should create POST request with headers', () => {
      const body = { name: 'John' }
      const headers = { 'Content-Type': 'application/json' }
      const request = ApiInteraction.createPostRequest('https://api.example.com/users', body, headers)

      expect(request.headers).toEqual(headers)
    })
  })

  describe('API assertion creation', () => {
    it('should create equality assertion', () => {
      const assertion = ApiInteraction.createEqualityAssertion('status', 200)

      expect(assertion.property).toBe('status')
      expect(assertion.operator).toBe('equals')
      expect(assertion.value).toBe(200)
    })

    it('should create existence assertion', () => {
      const assertion = ApiInteraction.createExistenceAssertion('data.userId')

      expect(assertion.property).toBe('data.userId')
      expect(assertion.operator).toBe('exists')
    })

    it('should create contains assertion', () => {
      const assertion = ApiInteraction.createContainsAssertion('body.message', 'success')

      expect(assertion.property).toBe('body.message')
      expect(assertion.operator).toBe('contains')
      expect(assertion.value).toBe('success')
    })
  })

  describe('Response validation', () => {
    it('should validate equality assertion', () => {
      const response = { status: 200, headers: {}, body: { id: 1 }, duration: 100 }
      const assertion = ApiInteraction.createEqualityAssertion('status', 200)

      const result = apiInteraction.validateResponse(response, [assertion])

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail equality assertion on mismatch', () => {
      const response = { status: 404, headers: {}, body: {}, duration: 100 }
      const assertion = ApiInteraction.createEqualityAssertion('status', 200)

      const result = apiInteraction.validateResponse(response, [assertion])

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('should validate existence assertion', () => {
      const response = { status: 200, headers: {}, body: { userId: 123 }, duration: 100 }
      const assertion = ApiInteraction.createExistenceAssertion('body.userId')

      const result = apiInteraction.validateResponse(response, [assertion])

      expect(result.valid).toBe(true)
    })

    it('should fail existence assertion when property missing', () => {
      const response = { status: 200, headers: {}, body: {}, duration: 100 }
      const assertion = ApiInteraction.createExistenceAssertion('body.userId')

      const result = apiInteraction.validateResponse(response, [assertion])

      expect(result.valid).toBe(false)
    })

    it('should validate contains assertion', () => {
      const response = { status: 200, headers: {}, body: { message: 'User created successfully' }, duration: 100 }
      const assertion = ApiInteraction.createContainsAssertion('body.message', 'created')

      const result = apiInteraction.validateResponse(response, [assertion])

      expect(result.valid).toBe(true)
    })

    it('should validate multiple assertions', () => {
      const response = { status: 201, headers: {}, body: { id: 1, email: 'test@example.com' }, duration: 100 }
      const assertions = [
        ApiInteraction.createEqualityAssertion('status', 201),
        ApiInteraction.createExistenceAssertion('body.id'),
        ApiInteraction.createContainsAssertion('body.email', 'test@'),
      ]

      const result = apiInteraction.validateResponse(response, assertions)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should report all assertion failures', () => {
      const response = { status: 404, headers: {}, body: {}, duration: 100 }
      const assertions = [
        ApiInteraction.createEqualityAssertion('status', 200),
        ApiInteraction.createExistenceAssertion('body.data'),
        ApiInteraction.createContainsAssertion('body.message', 'success'),
      ]

      const result = apiInteraction.validateResponse(response, assertions)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Greater than / Less than assertions', () => {
    it('should validate greater than', () => {
      const response = { status: 200, headers: {}, body: { count: 150 }, duration: 100 }
      const assertion = { property: 'body.count', operator: 'greaterThan' as const, value: 100 }

      const result = apiInteraction.validateResponse(response, [assertion])

      expect(result.valid).toBe(true)
    })

    it('should validate less than', () => {
      const response = { status: 200, headers: {}, body: { duration: 50 }, duration: 100 }
      const assertion = { property: 'body.duration', operator: 'lessThan' as const, value: 100 }

      const result = apiInteraction.validateResponse(response, [assertion])

      expect(result.valid).toBe(true)
    })

    it('should fail greater than assertion', () => {
      const response = { status: 200, headers: {}, body: { count: 50 }, duration: 100 }
      const assertion = { property: 'body.count', operator: 'greaterThan' as const, value: 100 }

      const result = apiInteraction.validateResponse(response, [assertion])

      expect(result.valid).toBe(false)
    })
  })

  describe('Validation management', () => {
    it('should add validation', () => {
      const validation: ApiValidation = {
        name: 'Get user',
        request: ApiInteraction.createGetRequest('https://api.example.com/users/1'),
        assertions: [ApiInteraction.createEqualityAssertion('status', 200)],
      }

      apiInteraction.addValidation(validation)

      expect(apiInteraction.getValidations()).toHaveLength(1)
    })

    it('should add multiple validations', () => {
      const validations: ApiValidation[] = [
        {
          name: 'Get user',
          request: ApiInteraction.createGetRequest('https://api.example.com/users/1'),
          assertions: [ApiInteraction.createEqualityAssertion('status', 200)],
        },
        {
          name: 'Create user',
          request: ApiInteraction.createPostRequest('https://api.example.com/users', { name: 'John' }),
          assertions: [ApiInteraction.createEqualityAssertion('status', 201)],
        },
      ]

      validations.forEach(v => apiInteraction.addValidation(v))

      expect(apiInteraction.getValidations()).toHaveLength(2)
    })

    it('should retrieve validations', () => {
      const validation: ApiValidation = {
        name: 'Get user',
        request: ApiInteraction.createGetRequest('https://api.example.com/users/1'),
        assertions: [ApiInteraction.createEqualityAssertion('status', 200)],
      }

      apiInteraction.addValidation(validation)
      const validations = apiInteraction.getValidations()

      expect(validations[0].name).toBe('Get user')
    })
  })

  describe('Mock response management', () => {
    it('should store mock response', () => {
      const response = { status: 200, headers: {}, body: { id: 1 }, duration: 50 }
      apiInteraction.mockResponse('https://api.example.com/users/1', response)

      const retrieved = apiInteraction.getResponse('https://api.example.com/users/1')

      expect(retrieved).toEqual(response)
    })

    it('should return undefined for non-existent response', () => {
      const response = apiInteraction.getResponse('https://api.example.com/nonexistent')

      expect(response).toBeUndefined()
    })

    it('should store multiple mock responses', () => {
      const response1 = { status: 200, headers: {}, body: { id: 1 }, duration: 50 }
      const response2 = { status: 200, headers: {}, body: { id: 2 }, duration: 45 }

      apiInteraction.mockResponse('https://api.example.com/users/1', response1)
      apiInteraction.mockResponse('https://api.example.com/users/2', response2)

      expect(apiInteraction.getResponse('https://api.example.com/users/1')).toEqual(response1)
      expect(apiInteraction.getResponse('https://api.example.com/users/2')).toEqual(response2)
    })
  })

  describe('Real-world API validation scenarios', () => {
    it('should validate user creation workflow', () => {
      const validation: ApiValidation = {
        name: 'Create user',
        request: ApiInteraction.createPostRequest(
          'https://api.example.com/users',
          { email: 'test@example.com', name: 'Test User' }
        ),
        assertions: [
          ApiInteraction.createEqualityAssertion('status', 201),
          ApiInteraction.createExistenceAssertion('body.id'),
          ApiInteraction.createEqualityAssertion('body.email', 'test@example.com'),
        ],
      }

      apiInteraction.addValidation(validation)
      expect(apiInteraction.getValidations()).toHaveLength(1)

      const response = { status: 201, headers: {}, body: { id: 1, email: 'test@example.com' }, duration: 120 }
      const result = apiInteraction.validateResponse(response, validation.assertions)

      expect(result.valid).toBe(true)
    })

    it('should validate user list with pagination', () => {
      const validation: ApiValidation = {
        name: 'List users',
        request: ApiInteraction.createGetRequest('https://api.example.com/users?page=1&limit=10'),
        assertions: [
          ApiInteraction.createEqualityAssertion('status', 200),
          ApiInteraction.createExistenceAssertion('body.items'),
          { property: 'body.total', operator: 'greaterThan', value: 0 },
        ],
      }

      const response = {
        status: 200,
        headers: {},
        body: { items: [{}, {}], total: 50, page: 1 },
        duration: 85,
      }

      const result = apiInteraction.validateResponse(response, validation.assertions)

      expect(result.valid).toBe(true)
    })

    it('should validate error response handling', () => {
      const validation: ApiValidation = {
        name: 'Get non-existent user',
        request: ApiInteraction.createGetRequest('https://api.example.com/users/999'),
        assertions: [
          ApiInteraction.createEqualityAssertion('status', 404),
          ApiInteraction.createExistenceAssertion('body.error'),
        ],
      }

      const response = { status: 404, headers: {}, body: { error: 'User not found' }, duration: 45 }
      const result = apiInteraction.validateResponse(response, validation.assertions)

      expect(result.valid).toBe(true)
    })

    it('should validate complex nested response', () => {
      const response = {
        status: 200,
        headers: {},
        body: {
          user: {
            id: 1,
            profile: {
              firstName: 'John',
              email: 'john@example.com',
            },
          },
        },
        duration: 150,
      }

      const assertions = [
        ApiInteraction.createEqualityAssertion('status', 200),
        ApiInteraction.createExistenceAssertion('body.user.profile.email'),
        ApiInteraction.createEqualityAssertion('body.user.profile.firstName', 'John'),
      ]

      const result = apiInteraction.validateResponse(response, assertions)

      expect(result.valid).toBe(true)
    })

    it('should validate authentication headers', () => {
      const headers = { Authorization: 'Bearer token123' }
      const request = ApiInteraction.createGetRequest('https://api.example.com/me', headers)

      expect(request.headers).toEqual(headers)
      expect(request.method).toBe('GET')
    })
  })

  describe('API validation with browser actions', () => {
    it('should pair API validation with click action', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: { primary: '[data-testid="create-user"]', fallbacks: [] },
        page: { url: 'https://example.com/users', title: 'Users' },
      }

      const validation: ApiValidation = {
        name: 'Create user',
        request: ApiInteraction.createPostRequest('https://api.example.com/users', { name: 'John' }),
        assertions: [ApiInteraction.createEqualityAssertion('status', 201)],
        expectedAction: action,
      }

      apiInteraction.addValidation(validation)

      expect(apiInteraction.getValidations()[0].expectedAction?.type).toBe('click')
    })

    it('should validate form submission workflow', () => {
      const actions: RecordedAction[] = [
        {
          type: 'input',
          timestamp: Date.now(),
          selector: { primary: '[name="email"]', fallbacks: [] },
          value: 'test@example.com',
          page: { url: 'https://example.com/register', title: 'Register' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[type="submit"]', fallbacks: [] },
          page: { url: 'https://example.com/register', title: 'Register' },
        },
      ]

      const validation: ApiValidation = {
        name: 'Register user',
        request: ApiInteraction.createPostRequest('https://api.example.com/auth/register', {
          email: 'test@example.com',
        }),
        assertions: [
          ApiInteraction.createEqualityAssertion('status', 201),
          ApiInteraction.createExistenceAssertion('body.token'),
        ],
      }

      apiInteraction.addValidation(validation)

      expect(apiInteraction.getValidations()).toHaveLength(1)
    })
  })

  describe('API assertion operators', () => {
    it('should handle notExists operator', () => {
      const response = { status: 200, headers: {}, body: { data: null }, duration: 100 }
      const assertion = { property: 'body.data', operator: 'notExists' as const }

      const result = apiInteraction.validateResponse(response, [assertion])

      expect(result.valid).toBe(true)
    })

    it('should validate all assertion operators', () => {
      const response = { status: 200, headers: {}, body: { value: 50, message: 'test message' }, duration: 100 }
      const assertions = [
        { property: 'status', operator: 'equals' as const, value: 200 },
        { property: 'body.message', operator: 'contains' as const, value: 'test' },
        { property: 'body.value', operator: 'exists' as const },
        { property: 'body.missing', operator: 'notExists' as const },
        { property: 'body.value', operator: 'greaterThan' as const, value: 40 },
        { property: 'body.value', operator: 'lessThan' as const, value: 60 },
      ]

      const result = apiInteraction.validateResponse(response, assertions)

      expect(result.valid).toBe(true)
    })
  })
})
