"""
Add ip_origens column to routers table
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_ip_origens_to_routers'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('routers', sa.Column('ip_origens', sa.JSON(), nullable=True))

def downgrade():
    op.drop_column('routers', 'ip_origens')
