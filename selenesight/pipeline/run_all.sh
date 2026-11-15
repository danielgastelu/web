#!/bin/bash
cd "$(dirname "$0")"
python3 -c "import horizons as H; H.export_terrain('../data/LDEM_85S_40M.IMG')" && \
python3 horizons.py ../data/LDEM_85S_40M.IMG ../data/LDEM_75S_240M.IMG 10000,5000,2000
echo FIN
