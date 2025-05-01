import React from 'react';

export default function Logo({ sx }) {
    return (
        <div style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#00ff00', ...sx }}>
            Radar!
        </div>
    );
}
