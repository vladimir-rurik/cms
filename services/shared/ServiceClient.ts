import { ServiceRequest, ServiceResponse } from './types';

export class ServiceClient {
  private services: Map<string, string> = new Map();

  constructor() {
    // Service endpoints - could be configured via environment variables
    this.services.set('component-service', process.env.COMPONENT_SERVICE_URL || 'http://localhost:3001');
    this.services.set('page-service', process.env.PAGE_SERVICE_URL || 'http://localhost:3002');
    this.services.set('plugin-service', process.env.PLUGIN_SERVICE_URL || 'http://localhost:3003');
    this.services.set('config-service', process.env.CONFIG_SERVICE_URL || 'http://localhost:3004');
  }

  async call(serviceName: string, method: string, data?: any): Promise<any> {
    const serviceUrl = this.services.get(serviceName);
    if (!serviceUrl) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const request: ServiceRequest = {
      id: this.generateId(),
      service: serviceName,
      method,
      data,
      timestamp: Date.now()
    };

    try {
      const response = await fetch(`${serviceUrl}/${method}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result: ServiceResponse = await response.json();

      if (!result.success) {
        throw new Error(`Service error: ${result.error}`);
      }

      return result.data;
    } catch (error) {
      console.error(`Error calling service ${serviceName}.${method}:`, error);
      throw error;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}