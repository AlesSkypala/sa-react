import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';

export const icon = (i: IconDefinition) => <><FontAwesomeIcon icon={i} className="icon" /> &nbsp;</>;
