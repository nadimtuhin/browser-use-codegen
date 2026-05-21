import { RecordedAction } from '../types'

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
}

export interface ApiResponse {
  status: number
  headers: Record<string, string>
  body: unknown
  duration: number
}

export interface ApiAssertion {
  property: string
  operator: 'equals' | 'contains' | 'exists' | 'notExists' | 'greaterThan' | 'lessThan'
  value?: unknown
}

export interface ApiValidation {
  name: string
  request: ApiRequest
  assertions: ApiAssertion[]
  expectedAction?: RecordedAction
}

export class ApiInteraction {
  private validations: ApiValidation[] = []
  private responses: Map<string, ApiResponse> = new Map()

  addValidation(validation: ApiValidation): void {
    this.validations.push(validation)
  }

  getValidations(): ApiValidation[] {
    return this.validations
  }

  /**
   * Mock API response for testing
   */
  mockResponse(url: string, response: ApiResponse): void {
    this.responses.set(url, response)
  }

  /**
   * Get mock response
   */
  getResponse(url: string): ApiResponse | undefined {
    return this.responses.get(url)
  }

  /**
   * Validate response against assertions
   */
  validateResponse(response: ApiResponse, assertions: ApiAssertion[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    assertions.forEach(assertion => {
      const error = this.validateAssertion(response, assertion)
      if (error) {
        errors.push(error)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate a single assertion
   */
  private validateAssertion(response: ApiResponse, assertion: ApiAssertion): string | null {
    const value = this.getPropertyValue(response, assertion.property)

    switch (assertion.operator) {
      case 'equals':
        if (value !== assertion.value) {
          return `Expected ${assertion.property} to equal ${assertion.value}, got ${value}`
        }
        break

      case 'contains':
        if (!String(value).includes(String(assertion.value))) {
          return `Expected ${assertion.property} to contain ${assertion.value}`
        }
        break

      case 'exists':
        if (value === undefined || value === null) {
          return `Expected ${assertion.property} to exist`
        }
        break

      case 'notExists':
        if (value !== undefined && value !== null) {
          return `Expected ${assertion.property} to not exist`
        }
        break

      case 'greaterThan':
        if (!(Number(value) > Number(assertion.value))) {
          return `Expected ${assertion.property} to be greater than ${assertion.value}`
        }
        break

      case 'lessThan':
        if (!(Number(value) < Number(assertion.value))) {
          return `Expected ${assertion.property} to be less than ${assertion.value}`
        }
        break
    }

    return null
  }

  /**
   * Get nested property value from object
   */
  private getPropertyValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((curr, prop) => {
      if (curr && typeof curr === 'object') {
        return (curr as Record<string, unknown>)[prop]
      }
      return undefined
    }, obj)
  }

  /**
   * Create API request for GET
   */
  static createGetRequest(url: string, headers?: Record<string, string>): ApiRequest {
    return {
      method: 'GET',
      url,
      headers,
    }
  }

  /**
   * Create API request for POST
   */
  static createPostRequest(url: string, body: unknown, headers?: Record<string, string>): ApiRequest {
    return {
      method: 'POST',
      url,
      body,
      headers,
    }
  }

  /**
   * Create assertion for property equality
   */
  static createEqualityAssertion(property: string, value: unknown): ApiAssertion {
    return {
      property,
      operator: 'equals',
      value,
    }
  }

  /**
   * Create assertion for property existence
   */
  static createExistenceAssertion(property: string): ApiAssertion {
    return {
      property,
      operator: 'exists',
    }
  }

  /**
   * Create assertion for string contains
   */
  static createContainsAssertion(property: string, value: string): ApiAssertion {
    return {
      property,
      operator: 'contains',
      value,
    }
  }
}
