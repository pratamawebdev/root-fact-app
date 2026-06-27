export const commonStyles = {
  errorContainer: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-md)',
    color: '#991b1b',
    fontSize: '0.875rem'
  },

  warningContainer: {
    color: '#92400e',
    fontStyle: 'italic'
  },

  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },

  smallSpinner: {
    width: '1rem',
    height: '1rem',
    marginBottom: 0
  },

  errorToast: {
    position: 'fixed',
    bottom: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: '380px',
    padding: '0.875rem 1rem',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-md)',
    color: '#991b1b',
    fontSize: '0.8125rem',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },

  closeButton: {
    marginLeft: 'auto',
    background: 'transparent',
    border: 'none',
    color: '#991b1b',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1.25rem',
    padding: 0,
    lineHeight: 1
  }
};
