export type AuthGatewaySuccess = {
  success: true;
};

export type AuthGatewayFailure = {
  success: false;
  error: string;
};

export type AuthGatewayResult = AuthGatewaySuccess | AuthGatewayFailure;
