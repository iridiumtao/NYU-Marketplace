// src/pages/test/VerifyEmail.test.jsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VerifyEmail from '../VerifyEmail';
import { endpoints } from '../../api/endpoints';
import apiClient from '../../api/client';

const mockLoginFn = vi.fn();
const mockNavigate = vi.fn();
let mockLocation = { state: { email: 'user@nyu.edu' } };

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLoginFn,
    isAuthenticated: vi.fn(() => false),
    isLoading: false,
  }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// Mock api client
vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('VerifyEmail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = { state: { email: 'user@nyu.edu' } };
  });

  it('redirects to login if email is missing in location state', async () => {
    mockLocation = { state: undefined };

    render(<VerifyEmail />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('shows error when OTP code is not 6 digits and does not call API', async () => {
    render(<VerifyEmail />);

    const button = screen.getByRole('button', { name: /verify & continue/i });
    fireEvent.click(button);

    expect(
      screen.getByText('Please enter the 6-digit code.')
    ).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('submits OTP successfully, logs in user and redirects home', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: {
        message: 'Email verified successfully',
        access_token: 'access',
        refresh_token: 'refresh',
        user: { id: 1, email: 'user@nyu.edu', is_email_verified: true },
      },
    });

    render(<VerifyEmail />);

    // Fill all 6 OTP inputs with "1"
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      fireEvent.change(input, { target: { value: '1' } });
    });

    const button = screen.getByRole('button', { name: /verify & continue/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        endpoints.auth.verifyOtp,
        {
          email: 'user@nyu.edu',
          otp: '111111',
        }
      );
      expect(mockLoginFn).toHaveBeenCalledWith(
        'access',
        'refresh',
        { id: 1, email: 'user@nyu.edu', is_email_verified: true }
      );
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('resends OTP and shows success message', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: {
        message: 'New verification code sent successfully.',
      },
    });

    render(<VerifyEmail />);

    const resendButton = screen.getByRole('button', { name: /resend otp/i });
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        endpoints.auth.resendOtp,
        {
          email: 'user@nyu.edu',
        }
      );
      expect(
        screen.getByText(/verification code sent successfully/i)
      ).toBeInTheDocument();
    });
  });
});
