import { render, screen } from '@testing-library/react';
import { ClaimList } from './ClaimList';

it('renders readable two-line claim copy with its origin instead of markup', () => {
  render(<ClaimList claims={[{
    id: 'claim-1', statement: '## <td>部署记录包含模型版本号</td>', status: 'missing', importance: 'high', evidenceIds: [], risk: '待核验', repair: '补材料', origin: 'openvino',
  }]} selectedId="claim-1" onSelect={() => undefined} />);

  expect(screen.getByText('部署记录包含模型版本号')).toBeVisible();
  expect(screen.queryByText(/##|<td>/)).not.toBeInTheDocument();
  expect(screen.getByText('OpenVINO 初审')).toBeVisible();
});
