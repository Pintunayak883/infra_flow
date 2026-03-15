declare global {
  namespace Cypress {
    interface Chainable {
      seedAuthSession(role?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('seedAuthSession', (role: string = 'student') => {
  cy.window().then((win) => {
    const authPayload = {
      id: 'user-test',
      name: 'Test User',
      email: 'test@campus.edu',
      role,
      token: 'frontend-token',
    };
    win.localStorage.setItem('infraflow:auth', JSON.stringify(authPayload));
  });
});

export {};
