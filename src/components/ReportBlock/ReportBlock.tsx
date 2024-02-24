import { useState } from 'react';

import classNames from 'classnames';

import styles from './ReportBlock.module.css';

export const ReportBlock = () => {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className={styles.root}>
      <button
        type="button"
        onClick={() => {
          setIsPaused(!isPaused);
        }}
      >
        {isPaused ? 'Resume' : 'Pause'}
      </button>
      <div
        className={classNames({
          'js-report': !isPaused,
        })}
      />
    </div>
  );
};
