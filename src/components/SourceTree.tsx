import * as React from 'react';
import { default as Tree, renderers, FlattenedNode, Node } from 'react-virtualized-tree';

const {Expandable} = renderers;

const Selection = ({node, children, onChange}: { node: FlattenedNode, children: React.ReactNode, onChange: any}) => {
    const {state: {selected} = {}} = node;
    const className = selected ? 'mi mi-check-box' : 'mi mi-check-box-outline-blank';
  
    return (
      <span>
        <i
          className={className}
          onClick={() =>
            onChange({
              node: {
                ...node,
                state: {
                  ...(node.state || {}),
                  selected: !selected,
                },
              },
              type: 3,
            })
          }
        />
        {children}
      </span>
    );
  };

class SourceTree
extends React.Component<Props, State> {
    handleChange = (nodes: Node[]) => {
      this.setState({nodes});
    };


    selectNodes = (nodes: Node[], selected: Node[]): Node[] =>
        nodes.map(n => ({
            ...n,
            children: n.children ? this.selectNodes(n.children, selected) : [],
            state: {
                ...n.state,
                selected,
            },
        }));

    nodeSelectionHandler = (nodes: Node[], updatedNode: Node): Node[] =>
        nodes.map(node => {
            if (node.id === updatedNode.id) {
                return {
                ...updatedNode,
                children: node.children ? this.selectNodes(node.children, updatedNode.state?.selected) : [],
                };
            }

            if (node.children) {
                return {...node, children: this.nodeSelectionHandler(node.children, updatedNode)};
            }

            return node;
        });

    public render() {
        const { sources } = this.props;

        return (
            <Tree
                nodes={this.props.sources}
                onChange={this.handleChange}
                extensions={{
                    updateTypeHandlers: {
                        [3]: this.nodeSelectionHandler,
                    },
                }}
            >
            {({style, node, ...rest}) => (
                <div style={style}>
                    <Expandable node={node} {...rest}>
                        <Selection node={node} {...rest}>
                        {node.name}
                        </Selection>
                    </Expandable>
                </div>
            )}
            </Tree>
        );
    }
}

export interface Props {
    sources: DataSource[];
}

export interface State {
}

export default SourceTree;