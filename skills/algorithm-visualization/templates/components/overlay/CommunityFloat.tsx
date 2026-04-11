import { useState } from 'react';

export function CommunityFloat() {
  const [open, setOpen] = useState(false);

  return (
    <div className="community-float" data-testid="community-float">
      <button
        type="button"
        data-testid="community-btn"
        className="community-btn"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        交流群
      </button>

      {open ? (
        <div
          className="community-pop"
          data-testid="community-pop"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <img
            src="./assets/qrcode-community.png"
            alt="算法交流群二维码"
            data-testid="community-qr"
            className="community-qr"
          />
          <p>微信扫码发送“leetcode”加入算法交流群</p>
        </div>
      ) : null}
    </div>
  );
}
