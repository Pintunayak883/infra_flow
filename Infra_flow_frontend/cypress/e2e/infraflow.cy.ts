describe('InfraFlow mission-critical flows', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('authenticates a user via the login form', () => {
    cy.intercept('POST', '**/auth/login', { fixture: 'auth/login-success.json' }).as('loginRequest');
    cy.intercept('GET', '**/complaints/user', { complaints: [] }).as('userComplaints');

    cy.visit('/login');
    cy.get('#email').type('jordan@campus.edu');
    cy.get('#password').type('password123');
    cy.contains('button', 'Sign In').click();

    cy.wait(['@loginRequest', '@userComplaints']);
    cy.url().should('include', '/dashboard');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('infraflow:auth')).to.exist;
    });
  });

  it('allows a student to submit a complaint', () => {
    cy.seedAuthSession();
    cy.intercept('GET', '**/complaints/user', { complaints: [] }).as('userComplaints');
    cy.intercept('POST', '**/complaints/create', { fixture: 'complaints/create-success.json' }).as('createComplaint');

    cy.visit('/submit-complaint');
    cy.wait('@userComplaints');
    cy.get('#rollNumber').type('EC-21-045');
    cy.get('#roomNumber').type('LAB-B204');
    cy.get('#category').select('Electrical');
    cy.get('#description').type('Lights flicker every few minutes.');
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('fake image bytes'),
      fileName: 'evidence.png',
      mimeType: 'image/png',
      lastModified: Date.now(),
    }, { force: true });

    cy.contains('button', 'Submit Complaint').click();
    cy.wait('@createComplaint');
    cy.contains('Complaint submitted successfully.').should('exist');
  });

  it('enables workers to view and progress assignments', () => {
    cy.seedAuthSession('worker');

    cy.intercept('GET', '**/complaints/user', { complaints: [] }).as('userComplaints');
    cy.intercept('GET', '**/complaints/assigned', { fixture: 'worker/assignments.json' }).as('fetchAssignments');
    cy.intercept('PUT', '**/complaints/update-status/*', { statusCode: 200, body: { message: 'updated' } }).as('updateStatus');

    cy.visit('/worker/tasks');
    cy.wait(['@userComplaints', '@fetchAssignments']);
    cy.contains('Projector flicker').should('exist');
    cy.contains('button', 'Advance status').click();
    cy.wait('@updateStatus');
    cy.wait('@fetchAssignments');
  });

  it('renders admin analytics cards', () => {
    cy.seedAuthSession('admin');
    cy.intercept('GET', '**/complaints/user', { complaints: [] }).as('userComplaints');
    cy.intercept('GET', '**/admin/dashboard-data', { fixture: 'admin/dashboard.json' }).as('dashboardData');

    cy.visit('/admin/dashboard');
    cy.wait(['@userComplaints', '@dashboardData']);

    cy.contains('Total complaints').parent().within(() => {
      cy.contains('10');
    });
    cy.contains('Assets at risk of failure').should('exist');
  });
});
