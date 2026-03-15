import { Router } from 'express';
import { register, login, adminLogin } from '../controllers/auth.controller.js';
import { validate, registerValidationRules, loginValidationRules } from '../middleware/auth.validation.js';

const router = Router();

router.post('/register', validate(registerValidationRules), register);
router.post('/login', validate(loginValidationRules), login);
router.post('/admin-login', adminLogin);

export default router;
