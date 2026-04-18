export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'secretKey',
  signOptions: {
    expiresIn: '1d',
  },
};