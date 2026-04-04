type Props = {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
};

export function AlgorithmThoughtModal({ open, title, content, onClose }: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-mask" data-testid="thought-modal-mask" onClick={onClose}>
      <section
        className="thought-modal"
        data-testid="thought-modal"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="thought-header">
          <h3>{title} - 解题思路</h3>
          <button type="button" data-testid="thought-modal-close" className="close-btn" onClick={onClose}>
            关闭
          </button>
        </header>
        <pre className="thought-content">{content}</pre>
      </section>
    </div>
  );
}
